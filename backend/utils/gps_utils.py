import math
from datetime import datetime, timedelta
from geopy.distance import geodesic
import numpy as np
from typing import List, Tuple, Optional

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcule la distance entre deux points GPS en kilomètres
    """
    try:
        point1 = (lat1, lon1)
        point2 = (lat2, lon2)
        return geodesic(point1, point2).kilometers
    except:
        return 0.0

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcule l'angle (bearing) entre deux points GPS
    """
    try:
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlon_rad = math.radians(lon2 - lon1)
        
        x = math.sin(dlon_rad) * math.cos(lat2_rad)
        y = math.cos(lat1_rad) * math.sin(lat2_rad) - \
            math.sin(lat1_rad) * math.cos(lat2_rad) * math.cos(dlon_rad)
        
        bearing_rad = math.atan2(x, y)
        bearing_deg = math.degrees(bearing_rad)
        
        return (bearing_deg + 360) % 360
    except:
        return 0.0

def calculate_speed(positions: List[dict]) -> float:
    """
    Calcule la vitesse moyenne à partir d'une liste de positions
    """
    if len(positions) < 2:
        return 0.0
    
    total_distance = 0.0
    total_time = 0.0
    
    for i in range(1, len(positions)):
        prev_pos = positions[i-1]
        curr_pos = positions[i]
        
        distance = calculate_distance(
            prev_pos['latitude'], prev_pos['longitude'],
            curr_pos['latitude'], curr_pos['longitude']
        )
        
        time_diff = (
            datetime.fromisoformat(curr_pos['timestamp'].replace('Z', '+00:00')) - 
            datetime.fromisoformat(prev_pos['timestamp'].replace('Z', '+00:00'))
        ).total_seconds() / 3600  # en heures
        
        if time_diff > 0:
            total_distance += distance
            total_time += time_diff
    
    return total_distance / total_time if total_time > 0 else 0.0

def get_traffic_factor(hour: int, day_of_week: int) -> float:
    """
    Retourne un facteur de trafic basé sur l'heure et le jour
    hour: 0-23
    day_of_week: 0=Lundi, 6=Dimanche
    """
    # Facteur de base
    factor = 1.0
    
    # Heures de pointe en semaine (7-9h et 17-19h)
    if day_of_week < 5:  # Lundi à vendredi
        if 7 <= hour <= 9 or 17 <= hour <= 19:
            factor = 1.4  # 40% plus lent
        elif 6 <= hour <= 22:
            factor = 1.2  # 20% plus lent
    else:  # Weekend
        if 10 <= hour <= 18:
            factor = 1.1  # 10% plus lent
    
    return factor

def get_weather_factor() -> float:
    """
    Facteur météo - pour l'instant retourne 1.0
    À implémenter avec une API météo si nécessaire
    """
    return 1.0

def smooth_positions(positions: List[dict], window_size: int = 3) -> List[dict]:
    """
    Lisse les positions GPS pour réduire les erreurs
    """
    if len(positions) <= window_size:
        return positions
    
    smoothed = []
    for i in range(len(positions)):
        start_idx = max(0, i - window_size // 2)
        end_idx = min(len(positions), i + window_size // 2 + 1)
        
        window_positions = positions[start_idx:end_idx]
        
        avg_lat = sum(p['latitude'] for p in window_positions) / len(window_positions)
        avg_lon = sum(p['longitude'] for p in window_positions) / len(window_positions)
        
        smoothed_pos = positions[i].copy()
        smoothed_pos['latitude'] = avg_lat
        smoothed_pos['longitude'] = avg_lon
        smoothed.append(smoothed_pos)
    
    return smoothed

def is_bus_at_stop(bus_lat: float, bus_lon: float, stop_lat: float, stop_lon: float, threshold_m: float = 100.0) -> bool:
    """
    Détermine si un bus est à un arrêt donné
    """
    distance_km = calculate_distance(bus_lat, bus_lon, stop_lat, stop_lon)
    distance_m = distance_km * 1000
    return distance_m <= threshold_m

def format_eta(eta_minutes: int) -> str:
    """
    Formate l'ETA en texte lisible
    """
    if eta_minutes < 1:
        return "Maintenant"
    elif eta_minutes == 1:
        return "1 minute"
    elif eta_minutes < 60:
        return f"{eta_minutes} minutes"
    else:
        hours = eta_minutes // 60
        minutes = eta_minutes % 60
        if hours == 1:
            return f"1h{minutes:02d}" if minutes > 0 else "1 heure"
        else:
            return f"{hours}h{minutes:02d}" if minutes > 0 else f"{hours} heures"

def validate_coordinates(latitude: float, longitude: float) -> bool:
    """
    Valide que les coordonnées GPS sont dans les limites acceptables
    """
    return (-90 <= latitude <= 90) and (-180 <= longitude <= 180)

def get_route_progress(bus_position: dict, route_stops: List[dict]) -> Tuple[int, float]:
    """
    Calcule la progression d'un bus sur sa ligne
    Retourne (next_stop_index, progress_percentage)
    """
    if not bus_position or not route_stops:
        return 0, 0.0
    
    bus_lat = bus_position['latitude']
    bus_lon = bus_position['longitude']
    
    # Trouve l'arrêt le plus proche
    min_distance = float('inf')
    closest_stop_idx = 0
    
    for i, stop in enumerate(route_stops):
        distance = calculate_distance(bus_lat, bus_lon, stop['stop']['latitude'], stop['stop']['longitude'])
        if distance < min_distance:
            min_distance = distance
            closest_stop_idx = i
    
    # Détermine si le bus va vers l'arrêt suivant ou s'en éloigne
    if closest_stop_idx < len(route_stops) - 1:
        next_stop = route_stops[closest_stop_idx + 1]
        distance_to_next = calculate_distance(
            bus_lat, bus_lon, 
            next_stop['stop']['latitude'], 
            next_stop['stop']['longitude']
        )
        
        # Si le bus est plus proche du prochain arrêt, il avance
        if min_distance > distance_to_next:
            closest_stop_idx += 1
    
    # Calcule le pourcentage de progression
    total_stops = len(route_stops)
    progress = (closest_stop_idx / max(total_stops - 1, 1)) * 100
    
    return closest_stop_idx, min(progress, 100.0)

def interpolate_position(pos1: dict, pos2: dict, ratio: float) -> dict:
    """
    Interpole entre deux positions GPS
    ratio: 0.0 = pos1, 1.0 = pos2
    """
    lat = pos1['latitude'] + (pos2['latitude'] - pos1['latitude']) * ratio
    lon = pos1['longitude'] + (pos2['longitude'] - pos1['longitude']) * ratio
    
    return {
        'latitude': lat,
        'longitude': lon,
        'timestamp': datetime.utcnow().isoformat()
    }
