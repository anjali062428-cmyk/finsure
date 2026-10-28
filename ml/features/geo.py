"""
FinSure Geographic Utilities Module
Provides great-circle distance and implied travel speed calculations for Indian cities.
Zero external API calls; pure mathematical spherical geometry (Haversine formula).
"""

import math
from typing import Tuple, Dict

# Major Indian city coordinates (Latitude, Longitude)
INDIAN_CITY_COORDINATES: Dict[str, Tuple[float, float]] = {
    "Mumbai": (19.0760, 72.8777),
    "Delhi": (28.7041, 77.1025),
    "Bengaluru": (12.9716, 77.5946),
    "Hyderabad": (17.3850, 78.4867),
    "Pune": (18.5204, 73.8567),
    "Ahmedabad": (23.0225, 72.5714),
    "Jaipur": (26.9124, 75.7873),
    "Lucknow": (26.8467, 80.9462),
    "Kolkata": (22.5726, 88.3639),
    "Chennai": (13.0827, 80.2707),
    "Chandigarh": (30.7333, 76.7794),
    "Goa": (15.2993, 74.1240),
    "Shimla": (31.1048, 77.1734),
    "Noida": (28.5355, 77.3910),
    "Frankfurt": (50.1109, 8.6821),  # Overseas bot testing
    "Lagos": (6.5244, 3.3792),        # Overseas ATO rogue node
    "Bucharest": (44.4268, 26.1025),   # Overseas ATO rogue node
    "Unknown_VPN": (0.0, 0.0)
}


def haversine_distance_km(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates great-circle distance between two (lat, lon) coordinates in kilometers."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    
    if lat1 == 0.0 and lon1 == 0.0 or lat2 == 0.0 and lon2 == 0.0:
        return 5000.0  # Default long distance for unknown overseas/VPN proxies
        
    R = 6371.0  # Earth radius in kilometers
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return round(R * c, 2)


def get_city_distance_km(city1: str, city2: str) -> float:
    """Returns approximate distance between two named cities."""
    if city1 == city2:
        return 0.0
    c1 = INDIAN_CITY_COORDINATES.get(city1, (20.5937, 78.9629))
    c2 = INDIAN_CITY_COORDINATES.get(city2, (20.5937, 78.9629))
    return haversine_distance_km(c1, c2)
