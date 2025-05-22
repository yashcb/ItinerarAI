import requests
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

if not GOOGLE_PLACES_API_KEY:
    raise ValueError("GOOGLE_PLACES_API_KEY environment variable is not set")

def get_place_info(location: str) -> Dict[str, Any]:
    """
    Get place information from Google Places API.
    
    Args:
        location (str): Location name or address
        
    Returns:
        Dict[str, Any]: Place information response
    """
    if not location:
        raise ValueError("Location cannot be empty")

    # First, get place ID using the Places API
    search_url = f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
    params = {
        'input': location,
        'inputtype': 'textquery',
        'fields': 'place_id,name,formatted_address,geometry',
        'key': GOOGLE_PLACES_API_KEY
    }

    try:
        search_response = requests.get(search_url, params=params)
        search_response.raise_for_status()
        search_data = search_response.json()

        if not search_data.get('candidates'):
            raise Exception("No place found for the given location")

        place_id = search_data['candidates'][0]['place_id']

        # Get detailed place information
        details_url = f"https://maps.googleapis.com/maps/api/place/details/json"
        details_params = {
            'place_id': place_id,
            'fields': 'name,rating,formatted_address,geometry,types',
            'key': GOOGLE_PLACES_API_KEY
        }

        details_response = requests.get(details_url, params=details_params)
        details_response.raise_for_status()
        return details_response.json()
        
    except requests.RequestException as e:
        raise Exception(f"Failed to fetch place information: {str(e)}")
