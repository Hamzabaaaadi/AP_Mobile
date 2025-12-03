from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from models import db, Bus, Position, Stop, RouteStop, Prediction, Occupancy
from utils.gps_utils import calculate_distance, calculate_speed, get_traffic_factor, get_weather_factor
import numpy as np

class PredictionEngine:
    """
    Moteur de prédiction des temps d'arrivée
    """
    
    @staticmethod
    def calculate_arrival_time(bus_id: int, stop_id: int) -> Optional[Dict]:
        """
        Calcule le temps d'arrivée prévu pour un bus à un arrêt
        """
        try:
            bus = Bus.query.get(bus_id)
            stop = Stop.query.get(stop_id)
            
            if not bus or not stop or not bus.current_route_id:
                return None
            
            # Position actuelle du bus
            current_position = bus.get_current_position()
            if not current_position:
                return None
            
            # Obtient les arrêts de la ligne
            route_stops = RouteStop.query.filter_by(route_id=bus.current_route_id)\
                                        .order_by(RouteStop.sequence).all()
            
            # Trouve l'arrêt cible dans la ligne
            target_stop_sequence = None
            for rs in route_stops:
                if rs.stop_id == stop_id:
                    target_stop_sequence = rs.sequence
                    break
            
            if target_stop_sequence is None:
                return None
            
            # Calcule la distance jusqu'à l'arrêt
            distance_km = calculate_distance(
                current_position.latitude, current_position.longitude,
                stop.latitude, stop.longitude
            )
            
            # Obtient l'historique des vitesses
            historical_speed = PredictionEngine._get_average_speed(bus_id, bus.current_route_id)
            
            # Facteurs de correction
            current_time = datetime.now()
            traffic_factor = get_traffic_factor(current_time.hour, current_time.weekday())
            weather_factor = get_weather_factor()
            
            # Calcul du temps de base
            if historical_speed > 0:
                base_time_hours = distance_km / historical_speed
            else:
                # Vitesse par défaut en zone urbaine
                base_time_hours = distance_km / 25.0
            
            # Temps ajusté avec facteurs
            adjusted_time_hours = base_time_hours * traffic_factor * weather_factor
            
            # Ajoute du temps pour les arrêts intermédiaires
            intermediate_stops = PredictionEngine._count_intermediate_stops(
                bus, current_position, target_stop_sequence, route_stops
            )
            stop_time_hours = (intermediate_stops * 1.0) / 60  # 1 minute par arrêt
            
            total_time_hours = adjusted_time_hours + stop_time_hours
            arrival_time = current_time + timedelta(hours=total_time_hours)
            
            # Calcule la confiance de la prédiction
            confidence = PredictionEngine._calculate_confidence(
                distance_km, historical_speed, intermediate_stops
            )
            
            return {
                'bus_id': bus_id,
                'stop_id': stop_id,
                'arrival_time': arrival_time,
                'confidence': confidence,
                'distance_km': distance_km,
                'eta_minutes': int(total_time_hours * 60)
            }
            
        except Exception as e:
            print(f"Erreur calcul prédiction: {e}")
            return None
    
    @staticmethod
    def _get_average_speed(bus_id: int, route_id: int) -> float:
        """
        Calcule la vitesse moyenne historique d'un bus sur une ligne
        """
        try:
            # Obtient les positions récentes
            recent_positions = Position.query.filter_by(bus_id=bus_id)\
                .filter(Position.timestamp >= datetime.now() - timedelta(hours=2))\
                .order_by(Position.timestamp.desc()).limit(10).all()
            
            if len(recent_positions) < 2:
                return 25.0  # Vitesse par défaut
            
            speeds = []
            for i in range(1, len(recent_positions)):
                prev_pos = recent_positions[i]
                curr_pos = recent_positions[i-1]
                
                distance = calculate_distance(
                    prev_pos.latitude, prev_pos.longitude,
                    curr_pos.latitude, curr_pos.longitude
                )
                
                time_diff = (curr_pos.timestamp - prev_pos.timestamp).total_seconds() / 3600
                
                if time_diff > 0:
                    speed = distance / time_diff
                    if 5 <= speed <= 80:  # Vitesses réalistes
                        speeds.append(speed)
            
            return np.mean(speeds) if speeds else 25.0
            
        except Exception:
            return 25.0
    
    @staticmethod
    def _count_intermediate_stops(bus: Bus, current_position: Position, 
                                 target_sequence: int, route_stops: List[RouteStop]) -> int:
        """
        Compte le nombre d'arrêts intermédiaires jusqu'à la destination
        """
        try:
            # Trouve l'arrêt le plus proche actuellement
            min_distance = float('inf')
            current_sequence = 0
            
            for rs in route_stops:
                distance = calculate_distance(
                    current_position.latitude, current_position.longitude,
                    rs.stop.latitude, rs.stop.longitude
                )
                if distance < min_distance:
                    min_distance = distance
                    current_sequence = rs.sequence
            
            # Compte les arrêts entre la position actuelle et la destination
            if target_sequence > current_sequence:
                return target_sequence - current_sequence - 1
            else:
                return 0
                
        except Exception:
            return 0
    
    @staticmethod
    def _calculate_confidence(distance_km: float, speed: float, stops: int) -> float:
        """
        Calcule la confiance de la prédiction
        """
        try:
            # Confiance de base selon la distance
            if distance_km <= 1:
                base_confidence = 0.9
            elif distance_km <= 5:
                base_confidence = 0.8
            elif distance_km <= 10:
                base_confidence = 0.7
            else:
                base_confidence = 0.6
            
            # Réduction selon le nombre d'arrêts
            stop_penalty = min(stops * 0.05, 0.3)
            
            # Réduction si vitesse atypique
            speed_penalty = 0.0
            if speed < 10 or speed > 60:
                speed_penalty = 0.2
            
            confidence = base_confidence - stop_penalty - speed_penalty
            return max(0.1, min(1.0, confidence))
            
        except Exception:
            return 0.5

    @staticmethod
    def update_all_predictions():
        """
        Met à jour toutes les prédictions pour tous les bus actifs
        """
        try:
            # Supprime les anciennes prédictions
            Prediction.query.filter(
                Prediction.created_at < datetime.now() - timedelta(minutes=5)
            ).delete()
            
            # Obtient tous les bus actifs
            active_buses = Bus.query.filter_by(is_in_service=True).all()
            
            predictions_created = 0
            for bus in active_buses:
                if not bus.current_route_id:
                    continue
                
                # Obtient les arrêts de la ligne
                route_stops = RouteStop.query.filter_by(route_id=bus.current_route_id)\
                    .order_by(RouteStop.sequence).all()
                
                for route_stop in route_stops:
                    prediction_data = PredictionEngine.calculate_arrival_time(
                        bus.id, route_stop.stop_id
                    )
                    
                    if prediction_data:
                        # Supprime l'ancienne prédiction pour ce bus/arrêt
                        Prediction.query.filter_by(
                            bus_id=bus.id,
                            stop_id=route_stop.stop_id
                        ).delete()
                        
                        # Crée une nouvelle prédiction
                        prediction = Prediction(
                            bus_id=prediction_data['bus_id'],
                            stop_id=prediction_data['stop_id'],
                            arrival_time=prediction_data['arrival_time'],
                            confidence=prediction_data['confidence']
                        )
                        
                        db.session.add(prediction)
                        predictions_created += 1
            
            db.session.commit()
            print(f"Prédictions mises à jour: {predictions_created}")
            
        except Exception as e:
            db.session.rollback()
            print(f"Erreur mise à jour prédictions: {e}")

class OccupancyManager:
    """
    Gestionnaire de l'occupation des bus
    """
    
    @staticmethod
    def update_occupancy(bus_id: int, passenger_count: int) -> bool:
        """
        Met à jour l'occupation d'un bus
        """
        try:
            bus = Bus.query.get(bus_id)
            if not bus:
                return False
            
            # Calcule le pourcentage
            capacity_percentage = (passenger_count / bus.capacity) * 100 if bus.capacity > 0 else 0
            
            # Crée un nouvel enregistrement
            occupancy = Occupancy(
                bus_id=bus_id,
                passenger_count=max(0, passenger_count),
                capacity_percentage=min(100, capacity_percentage)
            )
            
            db.session.add(occupancy)
            db.session.commit()
            
            return True
            
        except Exception as e:
            db.session.rollback()
            print(f"Erreur mise à jour occupation: {e}")
            return False
    
    @staticmethod
    def get_occupancy_stats(bus_id: int, hours: int = 24) -> Dict:
        """
        Obtient les statistiques d'occupation d'un bus
        """
        try:
            since = datetime.now() - timedelta(hours=hours)
            
            occupancy_records = Occupancy.query.filter_by(bus_id=bus_id)\
                .filter(Occupancy.timestamp >= since)\
                .order_by(Occupancy.timestamp.desc()).all()
            
            if not occupancy_records:
                return {
                    'current': 0,
                    'average': 0,
                    'peak': 0,
                    'total_records': 0
                }
            
            counts = [r.passenger_count for r in occupancy_records]
            
            return {
                'current': counts[0],
                'average': np.mean(counts),
                'peak': max(counts),
                'total_records': len(counts)
            }
            
        except Exception as e:
            print(f"Erreur stats occupation: {e}")
            return {'current': 0, 'average': 0, 'peak': 0, 'total_records': 0}
