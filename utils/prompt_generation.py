from datetime import datetime
from typing import Dict, Optional

def generate_itinerary_prompt(
    location: str,
    start_date: str,
    end_date: str,
    trip_purpose: str,
    weather_forecast: Optional[Dict] = None
) -> str:
    """
    Generate a detailed travel itinerary prompt for an AI assistant.
    
    Args:
        location: The travel destination
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        trip_purpose: Type of trip (e.g., 'holiday', 'business', 'adventure')
        weather_forecast: Optional dictionary containing weather information
    
    Returns:
        str: Formatted prompt for the AI
    """
    # Calculate number of days
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        num_days = (end - start).days + 1
        if num_days <= 0:
            raise ValueError("End date must be after start date")
    except ValueError as e:
        raise ValueError(f"Invalid date format or range: {e}")

    # Weather context
    weather_context = ""
    if weather_forecast:
        conditions = weather_forecast.get("weather", [{"description": "clear"}])[0]["description"]
        temp = weather_forecast.get("main", {}).get("temp", 20)
        weather_context = f"""
        Weather Forecast:
        - Conditions: {conditions}
        - Temperature: {temp}°C
        - Humidity: {weather_forecast.get('main', {}).get('humidity', 'N/A')}%
        - Wind: {weather_forecast.get('wind', {}).get('speed', 'N/A')} m/s
        """

    # Base prompt
    prompt = f"""You are an expert travel planner creating a detailed {num_days}-day itinerary for {location} from {start_date} to {end_date}.
    
Trip Purpose: {trip_purpose.capitalize()}

{weather_context}
"""
    # Add purpose-specific guidance
    if trip_purpose.lower() == 'holiday':
        prompt += """
Focus on:
- Leisure and relaxation activities
- Must-see tourist attractions
- Local cultural experiences
- Scenic spots and photo opportunities
- Quality dining options
"""
    elif trip_purpose.lower() == 'business':
        prompt += """
Focus on:
- Business-friendly accommodations
- Reliable workspaces and WiFi spots
- Professional meeting venues
- Business-appropriate dining
- Evening networking opportunities
"""
    else:  # Other trip types
        prompt += f"""
Focus on:
- {trip_purpose}-specific activities
- Unique local experiences
- Customized to traveler's interests
- Balanced schedule with downtime
"""

    # Add structure for the itinerary
    prompt += f"""
Create a detailed daily itinerary with the following structure for each day:

---
**Day X: [Day of Week, Date]**
**Weather Consideration:** [Brief note on weather impact]

**Morning:**
- Activity: [Detailed description]
- Duration: [Time estimate]
- Location: [Specific place/area]
- Why Recommended: [Brief explanation]
- Pro Tip: [Helpful local insight]

**Lunch:**
- Restaurant: [Name and type]
- Cuisine: [Type of food]
- Price Range: [Budget indicator]
- Why Recommended: [What makes it special]

**Afternoon:**
- Activity: [Detailed description]
- Duration: [Time estimate]
- Location: [Specific place/area]
- Why Recommended: [Brief explanation]

**Dinner:**
- Restaurant: [Name and type]
- Cuisine: [Type of food]
- Price Range: [Budget indicator]
- Why Recommended: [What makes it special]

**Evening:**
- Activity: [Detailed description]
- Duration: [Time estimate]
- Location: [Specific place/area]
- Why Recommended: [Brief explanation]
- Pro Tip: [Helpful local insight]
---

Additional Guidelines:
1. Be specific with names, addresses, and timings
2. Include estimated costs where possible
3. Mention if reservations are recommended/required
4. Consider walking distances between locations
5. Include public transport options
6. Note any safety considerations
7. Include local emergency numbers if relevant
8. Suggest alternatives for each major activity
9. Consider the weather in your recommendations
10. Keep the tone friendly and engaging

Format the response in clear, easy-to-read markdown.
"""
    return prompt