from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Occupancy, Bus
from utils.predictions import OccupancyManager
from datetime import datetime

occupancy_bp = Blueprint('occupancy', __name__)

@occupancy_bp.route('/', methods=['POST'])
@jwt_required()
def update_occupancy():
    """
    Met à jour l'occupation d'un bus (chauffeur)
    """
    try:
        driver_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'bus_id' not in data or 'passenger_count' not in data:
            return jsonify({'error': 'bus_id et passenger_count requis'}), 400
        
        # Vérifie que le bus appartient au chauffeur
        bus = Bus.query.filter_by(id=data['bus_id'], driver_id=driver_id).first()
        if not bus:
            return jsonify({'error': 'Bus non trouvé ou non assigné'}), 404
        
        passenger_count = max(0, int(data['passenger_count']))
        
        # Met à jour via le manager
        success = OccupancyManager.update_occupancy(data['bus_id'], passenger_count)
        
        if success:
            # Récupère la nouvelle occupation
            latest_occupancy = bus.get_current_occupancy()
            
            return jsonify({
                'message': 'Occupation mise à jour',
                'occupancy': latest_occupancy.to_dict() if latest_occupancy else None
            })
        else:
            return jsonify({'error': 'Erreur mise à jour occupation'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@occupancy_bp.route('/bus/<int:bus_id>', methods=['GET'])
def get_bus_occupancy(bus_id):
    """
    Obtient l'occupation actuelle et historique d'un bus
    """
    try:
        bus = Bus.query.get(bus_id)
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        hours = request.args.get('hours', 24, type=int)
        limit = request.args.get('limit', 100, type=int)
        
        # Occupation actuelle
        current_occupancy = bus.get_current_occupancy()
        
        # Historique
        from datetime import timedelta
        since_time = datetime.utcnow() - timedelta(hours=hours)
        
        occupancy_history = Occupancy.query.filter_by(bus_id=bus_id)\
            .filter(Occupancy.timestamp >= since_time)\
            .order_by(Occupancy.timestamp.desc())\
            .limit(limit).all()
        
        # Statistiques
        stats = OccupancyManager.get_occupancy_stats(bus_id, hours)
        
        return jsonify({
            'bus_id': bus_id,
            'bus': bus.to_dict(),
            'current': current_occupancy.to_dict() if current_occupancy else None,
            'history': [occ.to_dict() for occ in occupancy_history],
            'stats': stats,
            'period_hours': hours
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@occupancy_bp.route('/bus/<int:bus_id>/current', methods=['GET'])
def get_current_occupancy(bus_id):
    """
    Obtient l'occupation actuelle d'un bus
    """
    try:
        bus = Bus.query.get(bus_id)
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        current_occupancy = bus.get_current_occupancy()
        
        if not current_occupancy:
            return jsonify({
                'bus_id': bus_id,
                'occupancy': None,
                'message': 'Aucune donnée d\'occupation disponible'
            })
        
        return jsonify({
            'bus_id': bus_id,
            'occupancy': current_occupancy.to_dict(),
            'bus': {
                'capacity': bus.capacity,
                'number': bus.number
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@occupancy_bp.route('/increment', methods=['POST'])
@jwt_required()
def increment_occupancy():
    """
    Incrémente l'occupation d'un bus (passager monte)
    """
    try:
        driver_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'bus_id' not in data:
            return jsonify({'error': 'bus_id requis'}), 400
        
        bus = Bus.query.filter_by(id=data['bus_id'], driver_id=driver_id).first()
        if not bus:
            return jsonify({'error': 'Bus non trouvé ou non assigné'}), 404
        
        # Obtient l'occupation actuelle
        current_occupancy = bus.get_current_occupancy()
        current_count = current_occupancy.passenger_count if current_occupancy else 0
        
        # Incrémente (sans dépasser la capacité)
        new_count = min(current_count + 1, bus.capacity)
        
        success = OccupancyManager.update_occupancy(data['bus_id'], new_count)
        
        if success:
            latest_occupancy = bus.get_current_occupancy()
            return jsonify({
                'message': 'Passager ajouté',
                'occupancy': latest_occupancy.to_dict()
            })
        else:
            return jsonify({'error': 'Erreur mise à jour'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@occupancy_bp.route('/decrement', methods=['POST'])
@jwt_required()
def decrement_occupancy():
    """
    Décrémente l'occupation d'un bus (passager descend)
    """
    try:
        driver_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'bus_id' not in data:
            return jsonify({'error': 'bus_id requis'}), 400
        
        bus = Bus.query.filter_by(id=data['bus_id'], driver_id=driver_id).first()
        if not bus:
            return jsonify({'error': 'Bus non trouvé ou non assigné'}), 404
        
        # Obtient l'occupation actuelle
        current_occupancy = bus.get_current_occupancy()
        current_count = current_occupancy.passenger_count if current_occupancy else 0
        
        # Décrémente (minimum 0)
        new_count = max(current_count - 1, 0)
        
        success = OccupancyManager.update_occupancy(data['bus_id'], new_count)
        
        if success:
            latest_occupancy = bus.get_current_occupancy()
            return jsonify({
                'message': 'Passager retiré',
                'occupancy': latest_occupancy.to_dict()
            })
        else:
            return jsonify({'error': 'Erreur mise à jour'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@occupancy_bp.route('/reset', methods=['POST'])
@jwt_required()
def reset_occupancy():
    """
    Remet à zéro l'occupation d'un bus
    """
    try:
        driver_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'bus_id' not in data:
            return jsonify({'error': 'bus_id requis'}), 400
        
        bus = Bus.query.filter_by(id=data['bus_id'], driver_id=driver_id).first()
        if not bus:
            return jsonify({'error': 'Bus non trouvé ou non assigné'}), 404
        
        success = OccupancyManager.update_occupancy(data['bus_id'], 0)
        
        if success:
            return jsonify({'message': 'Occupation remise à zéro'})
        else:
            return jsonify({'error': 'Erreur remise à zéro'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@occupancy_bp.route('/stats', methods=['GET'])
def get_occupancy_stats():
    """
    Obtient les statistiques d'occupation globales
    """
    try:
        # Stats pour tous les bus actifs
        active_buses = Bus.query.filter_by(is_in_service=True).all()
        
        total_capacity = 0
        total_occupancy = 0
        bus_stats = []
        
        for bus in active_buses:
            current_occupancy = bus.get_current_occupancy()
            current_count = current_occupancy.passenger_count if current_occupancy else 0
            
            total_capacity += bus.capacity
            total_occupancy += current_count
            
            bus_stats.append({
                'bus_id': bus.id,
                'bus_number': bus.number,
                'capacity': bus.capacity,
                'current_occupancy': current_count,
                'percentage': (current_count / bus.capacity * 100) if bus.capacity > 0 else 0
            })
        
        # Calcule les pourcentages globaux
        overall_percentage = (total_occupancy / total_capacity * 100) if total_capacity > 0 else 0
        
        return jsonify({
            'overall': {
                'total_capacity': total_capacity,
                'total_occupancy': total_occupancy,
                'percentage': round(overall_percentage, 1)
            },
            'buses': bus_stats,
            'active_buses_count': len(active_buses),
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
