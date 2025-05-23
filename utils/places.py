import aiohttp
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY")

if not GOOGLE_PLACES_API_KEY:
    raise ValueError("GOOGLE_PLACES_API_KEY environment variable is not set")

async def get_place_info(location: str) -> Dict[str, Any]:
    """
    Get place information from Google Places API asynchronously.
    
    Args:
        location (str): Location name or address
        
    Returns:
        Dict[str, Any]: Place information response
    """
    if not location:
        raise ValueError("Location cannot be empty")

    # First, get place ID using the Places API
    search_url = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
    params = {
        'input': location,
        'inputtype': 'textquery',
        'fields': 'place_id,name,formatted_address,geometry',
        'key': GOOGLE_PLACES_API_KEY
    }

    async with aiohttp.ClientSession() as session:
        try:
            # Get place ID
            async with session.get(search_url, params=params) as response:
                response.raise_for_status()
                search_data = await response.json()

                if not search_data.get('candidates'):
                    raise Exception("No place found for the given location")

                place_id = search_data['candidates'][0]['place_id']

            # Get detailed place information
            details_url = "https://maps.googleapis.com/maps/api/place/details/json"
            details_params = {
                'place_id': place_id,
                'fields': 'name,rating,formatted_address,geometry,types',
                'key': GOOGLE_PLACES_API_KEY
            }

            async with session.get(details_url, params=details_params) as details_response:
                details_response.raise_for_status()
                place_details = (await details_response.json()).get('result', {})

                return {
                    'name': place_details.get('name', location),
                    'formatted_address': place_details.get('formatted_address', location),
                    'geometry': place_details.get('geometry', {}),
                    'types': place_details.get('types', [])
                }

        except aiohttp.ClientError as e:
            raise Exception(f"Error fetching place information: {str(e)}")
        except Exception as e:
            raise Exception(f"Unexpected error: {str(e)}")
