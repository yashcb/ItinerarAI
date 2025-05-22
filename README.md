# AI Travel Companion API

A FastAPI-based backend service for fetching location and weather information.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
```bash
venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

## Environment Variables

- `GOOGLE_PLACES_API_KEY`: Your Google Places API key
- `OPENWEATHER_API_KEY`: Your OpenWeatherMap API key

## Running the Application

```bash
uvicorn main:app --reload
```

## API Endpoints

- `/health`: Health check endpoint
- `/location-info`: Get place information from Google Places API
- `/weather`: Get weather information from OpenWeatherMap API
