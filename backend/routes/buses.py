from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Bus, Driver, Route
from datetime import datetime

buses_bp = Blueprint('buses', __name__)

@buses_bp.route('/', methods=['GET'])
def get_all_buses():
    """
    Obtient tous les bus avec leurs informations
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        route_id = request.args.get('route_id', type=int)
        
        query = Bus.query
        
        # Filtres
        if status:
            query = query.filter_by(status=status)
        if route_id:
            query = query.filter_by(current_route_id=route_id)
        
        buses = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'buses': [bus.to_dict() for bus in buses.items],
            'total': buses.total,
            'pages': buses.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<int:bus_id>', methods=['GET'])
def get_bus(bus_id):
    """
    Obtient les détails d'un bus spécifique
    """
    try:
        bus = Bus.query.get(bus_id)
        
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        return jsonify({'bus': bus.to_dict()})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<int:bus_id>/positions', methods=['GET'])
def get_bus_positions(bus_id):
    """
    Obtient l'historique des positions d'un bus
    """
    try:
        bus = Bus.query.get(bus_id)
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        limit = request.args.get('limit', 100, type=int)
        
        positions = bus.positions.order_by(db.desc('timestamp')).limit(limit).all()
        
        return jsonify({
            'bus_id': bus_id,
            'positions': [pos.to_dict() for pos in positions]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<int:bus_id>/occupancy', methods=['GET'])
def get_bus_occupancy(bus_id):
    """
    Obtient l'historique d'occupation d'un bus
    """
    try:
        bus = Bus.query.get(bus_id)
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        limit = request.args.get('limit', 50, type=int)
        
        occupancy = bus.occupancy_records.order_by(db.desc('timestamp')).limit(limit).all()
        
        return jsonify({
            'bus_id': bus_id,
            'occupancy': [occ.to_dict() for occ in occupancy],
            'current': occupancy[0].to_dict() if occupancy else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/', methods=['POST'])
@jwt_required()
def create_bus():
    """
    Crée un nouveau bus (admin seulement)
    """
    try:
        data = request.get_json()
        
        required_fields = ['number', 'license_plate', 'capacity']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Champs requis manquants'}), 400
        
        # Vérifie l'unicité
        if Bus.query.filter_by(number=data['number']).first():
            return jsonify({'error': 'Numéro de bus déjà utilisé'}), 409
        
        if Bus.query.filter_by(license_plate=data['license_plate']).first():
            return jsonify({'error': 'Plaque d\'immatriculation déjà utilisée'}), 409
        
        bus = Bus(
            number=data['number'],
            license_plate=data['license_plate'],
            capacity=data['capacity'],
            driver_id=data.get('driver_id'),
            current_route_id=data.get('current_route_id'),
            status=data.get('status', 'inactive')
        )
        
        db.session.add(bus)
        db.session.commit()
        
        return jsonify({
            'message': 'Bus créé avec succès',
            'bus': bus.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<int:bus_id>', methods=['PUT'])
@jwt_required()
def update_bus(bus_id):
    """
    Met à jour un bus
    """
    try:
        bus = Bus.query.get(bus_id)
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        data = request.get_json()
        
        # Met à jour les champs modifiables
        updateable_fields = ['capacity', 'driver_id', 'current_route_id', 'status', 'is_in_service']
        for field in updateable_fields:
            if field in data:
                setattr(bus, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Bus mis à jour',
            'bus': bus.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<int:bus_id>/status', methods=['PUT'])
@jwt_required()
def update_bus_status(bus_id):
    """
    Met à jour le statut d'un bus (pour les chauffeurs)
    """
    try:
        driver_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data or 'is_in_service' not in data:
            return jsonify({'error': 'Statut de service requis'}), 400
        
        bus = Bus.query.filter_by(id=bus_id, driver_id=driver_id).first()
        if not bus:
            return jsonify({'error': 'Bus non trouvé ou non assigné'}), 404
        
        bus.is_in_service = data['is_in_service']
        bus.status = 'active' if data['is_in_service'] else 'inactive'
        
        db.session.commit()
        
        return jsonify({
            'message': 'Statut mis à jour',
            'bus': bus.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/active', methods=['GET'])
def get_active_buses():
    """
    Obtient tous les bus actuellement en service
    """
    try:
        buses = Bus.query.filter_by(is_in_service=True, status='active').all()
        
        return jsonify({
            'buses': [bus.to_dict() for bus in buses],
            'count': len(buses)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/driver/<int:driver_id>', methods=['GET'])
@jwt_required()
def get_driver_buses(driver_id):
    """
    Obtient les bus assignés à un chauffeur
    """
    try:
        current_driver_id = int(get_jwt_identity())
        
        # Un chauffeur ne peut voir que ses propres bus
        if current_driver_id != driver_id:
            return jsonify({'error': 'Accès non autorisé'}), 403
        
        buses = Bus.query.filter_by(driver_id=driver_id).all()
        
        return jsonify({
            'buses': [bus.to_dict() for bus in buses],
            'count': len(buses)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@buses_bp.route('/<int:bus_id>', methods=['DELETE'])
@jwt_required()
def delete_bus(bus_id):
    """
    Supprime un bus (admin seulement)
    """
    try:
        bus = Bus.query.get(bus_id)
        if not bus:
            return jsonify({'error': 'Bus non trouvé'}), 404
        
        db.session.delete(bus)
        db.session.commit()
        
        return jsonify({'message': 'Bus supprimé'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
