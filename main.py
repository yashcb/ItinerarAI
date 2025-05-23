from fastapi import FastAPI, HTTPException, status, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import requests
from dotenv import load_dotenv
import os
import openai
import uuid
import time
import json
from datetime import datetime
from enum import Enum
from fastapi.responses import JSONResponse
from threading import Lock

# Import utility functions
from utils.weather import get_weather_data
from utils.places import get_place_info
from utils.prompt_generation import generate_itinerary_prompt

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="AI Travel Companion API",
    description="API for generating travel itineraries and providing travel information",
    version="1.0.0"
)

# Set OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")
if not openai.api_key:
    raise ValueError("OPENAI_API_KEY environment variable not set")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for tasks
tasks = {}
tasks_lock = Lock()

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class TaskInfo(BaseModel):
    task_id: str
    status: TaskStatus
    progress: int = 0
    current_step: str = ""
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: float
    updated_at: float

# Request/Response Models
class LocationRequest(BaseModel):
    location: str

class WeatherRequest(BaseModel):
    latitude: float
    longitude: float

class ItineraryRequest(BaseModel):
    location: str
    start_date: str
    end_date: str
    trip_purpose: str
    weather_forecast: Optional[Dict] = None

class StartItineraryRequest(BaseModel):
    location: str
    start_date: str
    end_date: str
    trip_purpose: str
    track_progress: bool = True

async def update_task_progress(task_id: str, status: TaskStatus, progress: int = 0, 
                             current_step: str = "", result: Optional[Dict] = None, 
                             error: Optional[str] = None):
    with tasks_lock:
        if task_id not in tasks:
            return False
        
        task = tasks[task_id]
        task.status = status
        task.progress = progress
        task.current_step = current_step
        task.updated_at = time.time()
        
        if result is not None:
            task.result = result
        if error is not None:
            task.error = error
            
        return True

async def generate_itinerary_async(task_id: str, request: ItineraryRequest):
    try:
        await update_task_progress(
            task_id=task_id,
            status=TaskStatus.PROCESSING,
            progress=10,
            current_step="Fetching location information..."
        )
        
        # Get location info
        location_info = await get_place_info(request.location)
        
        await update_task_progress(
            task_id=task_id,
            status=TaskStatus.PROCESSING,
            progress=30,
            current_step="Getting weather forecast..."
        )
        
        # Get weather info
        weather_forecast = await get_weather_data(
            latitude=location_info['geometry']['location']['lat'],
            longitude=location_info['geometry']['location']['lng']
        )
        
        await update_task_progress(
            task_id=task_id,
            status=TaskStatus.PROCESSING,
            progress=50,
            current_step="Generating your itinerary..."
        )
        
        # Generate itinerary
        prompt = generate_itinerary_prompt(
            location=request.location,
            start_date=request.start_date,
            end_date=request.end_date,
            trip_purpose=request.trip_purpose,
            weather_forecast=weather_forecast
        )
        
        await update_task_progress(
            task_id=task_id,
            status=TaskStatus.PROCESSING,
            progress=70,
            current_step="Finalizing your travel plan..."
        )
        
        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful travel assistant that creates detailed travel itineraries."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        # Extract the generated itinerary
        itinerary = response.choices[0].message['content'].strip()
        
        result = {
            "itinerary": itinerary,
            "location": request.location,
            "location_description": location_info.get('formatted_address', request.location),
            "latitude": location_info['geometry']['location']['lat'],
            "longitude": location_info['geometry']['location']['lng'],
            "start_date": request.start_date,
            "end_date": request.end_date,
            "trip_purpose": request.trip_purpose,
            "weather_forecast": weather_forecast
        }
        
        await update_task_progress(
            task_id=task_id,
            status=TaskStatus.COMPLETED,
            progress=100,
            current_step="Done!",
            result=result
        )
        
    except Exception as e:
        error_msg = str(e)
        await update_task_progress(
            task_id=task_id,
            status=TaskStatus.FAILED,
            progress=0,
            current_step="Error occurred",
            error=error_msg
        )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "OK"}

# Start itinerary generation endpoint
@app.post("/generate-itinerary/start")
async def start_itinerary_generation(
    request: StartItineraryRequest,
    background_tasks: BackgroundTasks
):
    task_id = str(uuid.uuid4())
    
    task = TaskInfo(
        task_id=task_id,
        status=TaskStatus.PENDING,
        created_at=time.time(),
        updated_at=time.time()
    )
    
    with tasks_lock:
        tasks[task_id] = task
    
    # Start background task
    background_tasks.add_task(
        generate_itinerary_async,
        task_id=task_id,
        request=ItineraryRequest(
            location=request.location,
            start_date=request.start_date,
            end_date=request.end_date,
            trip_purpose=request.trip_purpose
        )
    )
    
    return {"task_id": task_id}

# Check task status endpoint
@app.get("/itinerary/status/{task_id}")
async def check_itinerary_status(task_id: str):
    with tasks_lock:
        task = tasks.get(task_id)
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )
    
    # Clean up old completed/failed tasks (older than 1 hour)
    current_time = time.time()
    if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED] and \
       (current_time - task.updated_at) > 3600:  # 1 hour
        with tasks_lock:
            tasks.pop(task_id, None)
    
    return {
        "task_id": task.task_id,
        "status": task.status,
        "progress": task.progress,
        "current_step": task.current_step,
        "result": task.result,
        "error": task.error
    }

# Location info endpoint
@app.post("/location-info")
async def get_location_info(request: LocationRequest):
    try:
        return await get_place_info(request.location)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Weather endpoint
@app.post("/weather")
async def get_weather(request: WeatherRequest):
    try:
        return await get_weather_data(latitude=request.latitude, longitude=request.longitude)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Original itinerary generation endpoint (kept for backward compatibility)
@app.post("/generate-itinerary")
async def generate_itinerary(request: ItineraryRequest):
    """
    Generate a travel itinerary based on the provided parameters using OpenAI's GPT-4.
    """
    try:
        # Generate the prompt for the AI
        prompt = generate_itinerary_prompt(
            location=request.location,
            start_date=request.start_date,
            end_date=request.end_date,
            trip_purpose=request.trip_purpose,
            weather_forecast=request.weather_forecast
        )
        
        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful travel assistant that creates detailed travel itineraries."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        # Extract the generated itinerary
        itinerary = response.choices[0].message['content'].strip()
        
        return {
            "status": "success",
            "itinerary": itinerary,
            "metadata": {
                "model": "gpt-4",
                "location": request.location,
                "start_date": request.start_date,
                "end_date": request.end_date,
                "trip_purpose": request.trip_purpose
            }
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while generating the itinerary: {str(e)}"
        )
