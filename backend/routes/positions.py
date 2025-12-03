from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Position, Bus
from datetime import datetime
from utils.gps_utils import validate_coordinates
from utils.predictions import PredictionEngine

positions_bp = Blueprint('positions', __name__)

@positions_bp.route('/', methods=['POST'])
@jwt_required()
def create_position():
    """
    Enregistre une nouvelle position GPS (chauffeur)
    """
    try:
        driver_id = int(get_jwt_identity())
        data = request.get_json()
        
        required_fields = ['bus_id', 'latitude', 'longitude']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Champs requis manquants'}), 400
        
        # Vérifie que le bus appartient au chauffeur
        bus = Bus.query.filter_by(id=data['bus_id'], driver_id=driver_id).first()
        if not bus:
            return jsonify({'error': 'Bus non trouvé ou non assigné'}), 404
        
        # Valide les coordonnées
        if not validate_coordinates(data['latitude'], data['longitude']):
            return jsonify({'error': 'Coordonnées GPS invalides'}), 400
        
        # Crée la nouvelle position
        position = Position(
            bus_id=data['bus_id'],
            latitude=data['latitude'],
            longitude=data['longitude'],
            speed=data.get('speed', 0.0),
            heading=data.get('heading', 0.0),
            accuracy=data.get('accuracy', 0.0),
            timestamp=datetime.utcnow()
        )
        
        db.session.add(position)
        db.session.commit()
        
        # Met à jour les prédictions pour ce bus (async si possible)
        try:
            PredictionEngine.update_all_predictions()
        except Exception as e:
            print(f"Erreur mise à jour prédictions: {e}")
        
        return jsonify({
            'message': 'Position enregistrée',
            'position': position.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@positions_bp.route('/bus/<int:bus_id>', methods=['GET'])
def get_bus_positions(bus_id):
    """
    Obtient les positions d'un bus
    """
    try:
        bus = Bus.query.get(bus_id)
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        limit = request.args.get('limit', 100, type=int)
        since_minutes = request.args.get('since_minutes', type=int)
        
        query = Position.query.filter_by(bus_id=bus_id)
        
        if since_minutes:
            since_time = datetime.utcnow() - timedelta(minutes=since_minutes)
            query = query.filter(Position.timestamp >= since_time)
        
        positions = query.order_by(Position.timestamp.desc()).limit(limit).all()
        
        return jsonify({
            'bus_id': bus_id,
            'positions': [pos.to_dict() for pos in positions],
            'count': len(positions)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@positions_bp.route('/current', methods=['GET'])
def get_current_positions():
    """
    Obtient les dernières positions de tous les bus actifs
    """
    try:
        # Obtient tous les bus en service
        active_buses = Bus.query.filter_by(is_in_service=True).all()
        
        current_positions = []
        for bus in active_buses:
            latest_position = Position.query.filter_by(bus_id=bus.id)\
                .order_by(Position.timestamp.desc()).first()
            
            if latest_position:
                position_data = latest_position.to_dict()
                position_data['bus'] = bus.to_dict()
                current_positions.append(position_data)
        
        return jsonify({
            'positions': current_positions,
            'count': len(current_positions),
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@positions_bp.route('/bus/<int:bus_id>/current', methods=['GET'])
def get_current_position(bus_id):
    """
    Obtient la position actuelle d'un bus spécifique
    """
    try:
        bus = Bus.query.get(bus_id)
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        position = Position.query.filter_by(bus_id=bus_id)\
            .order_by(Position.timestamp.desc()).first()
        
        if not position:
            return jsonify({'error': 'Aucune position disponible'}), 404
        
        return jsonify({
            'position': position.to_dict(),
            'bus': bus.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@positions_bp.route('/bulk', methods=['POST'])
@jwt_required()
def create_bulk_positions():
    """
    Enregistre plusieurs positions en une fois
    """
    try:
        driver_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'positions' not in data:
            return jsonify({'error': 'Liste de positions requise'}), 400
        
        positions_created = 0
        errors = []
        
        for pos_data in data['positions']:
            try:
                # Vérifie que le bus appartient au chauffeur
                bus = Bus.query.filter_by(id=pos_data['bus_id'], driver_id=driver_id).first()
                if not bus:
                    errors.append(f"Bus {pos_data['bus_id']} non assigné")
                    continue
                
                # Valide les coordonnées
                if not validate_coordinates(pos_data['latitude'], pos_data['longitude']):
                    errors.append(f"Coordonnées invalides pour bus {pos_data['bus_id']}")
                    continue
                
                position = Position(
                    bus_id=pos_data['bus_id'],
                    latitude=pos_data['latitude'],
                    longitude=pos_data['longitude'],
                    speed=pos_data.get('speed', 0.0),
                    heading=pos_data.get('heading', 0.0),
                    accuracy=pos_data.get('accuracy', 0.0),
                    timestamp=datetime.utcnow()
                )
                
                db.session.add(position)
                positions_created += 1
                
            except Exception as e:
                errors.append(f"Erreur position: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            'message': f'{positions_created} positions créées',
            'created': positions_created,
            'errors': errors
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@positions_bp.route('/bus/<int:bus_id>/track', methods=['GET'])
def track_bus(bus_id):
    """
    Obtient le trajet complet d'un bus pour une journée
    """
    try:
        from datetime import timedelta
        
        bus = Bus.query.get(bus_id)
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        # Positions des dernières 24h par défaut
        hours = request.args.get('hours', 24, type=int)
        since_time = datetime.utcnow() - timedelta(hours=hours)
        
        positions = Position.query.filter_by(bus_id=bus_id)\
            .filter(Position.timestamp >= since_time)\
            .order_by(Position.timestamp.asc()).all()
        
        # Calcule des statistiques
        total_distance = 0.0
        if len(positions) > 1:
            from utils.gps_utils import calculate_distance
            for i in range(1, len(positions)):
                distance = calculate_distance(
                    positions[i-1].latitude, positions[i-1].longitude,
                    positions[i].latitude, positions[i].longitude
                )
                total_distance += distance
        
        return jsonify({
            'bus_id': bus_id,
            'bus': bus.to_dict(),
            'track': {
                'positions': [pos.to_dict() for pos in positions],
                'count': len(positions),
                'total_distance_km': round(total_distance, 2),
                'period_hours': hours,
                'start_time': positions[0].timestamp.isoformat() if positions else None,
                'end_time': positions[-1].timestamp.isoformat() if positions else None
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
