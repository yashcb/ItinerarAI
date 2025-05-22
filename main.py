from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import requests
from dotenv import load_dotenv
import os
from utils.weather import get_weather_data
from utils.places import get_place_info

load_dotenv()

app = FastAPI(title="AI Travel Companion API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "OK"}

# Location info endpoint
class LocationRequest(BaseModel):
    location: str

@app.post("/location-info")
async def get_location_info(request: LocationRequest):
    try:
        return get_place_info(request.location)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Weather endpoint
class WeatherRequest(BaseModel):
    latitude: float
    longitude: float

@app.post("/weather")
async def get_weather(request: WeatherRequest):
    try:
        return get_weather_data(request.latitude, request.longitude)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
