from flask import Blueprint, request, jsonify
from models import db, Stop, Route, RouteStop, UserFavorite
from utils.gps_utils import calculate_distance
import math

stops_bp = Blueprint('stops', __name__)

@stops_bp.route('/', methods=['GET'])
def get_all_stops():
    """
    Obtient tous les arrêts
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        route_id = request.args.get('route_id', type=int)
        search = request.args.get('search', '')
        
        query = Stop.query.filter_by(is_active=True)
        
        # Filtre par ligne si spécifiée
        if route_id:
            route_stop_ids = db.session.query(RouteStop.stop_id)\
                .filter_by(route_id=route_id).subquery()
            query = query.filter(Stop.id.in_(route_stop_ids))
        
        # Recherche par nom
        if search:
            query = query.filter(Stop.name.ilike(f'%{search}%'))
        
        stops = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'stops': [stop.to_dict() for stop in stops.items],
            'total': stops.total,
            'pages': stops.pages,
            'current_page': page
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stops_bp.route('/<int:stop_id>', methods=['GET'])
def get_stop(stop_id):
    """
    Obtient les détails d'un arrêt spécifique
    """
    try:
        stop = Stop.query.get(stop_id)
        
        if not stop or not stop.is_active:
            return jsonify({'error': 'Arrêt non trouvé'}), 404
        
        # Obtient les lignes qui passent par cet arrêt
        route_stops = RouteStop.query.filter_by(stop_id=stop_id)\
            .join(Route).filter(Route.is_active == True)\
            .order_by(RouteStop.sequence).all()
        
        routes = []
        for rs in route_stops:
            route_data = rs.route.to_dict()
            route_data['sequence'] = rs.sequence
            route_data['estimated_time'] = rs.estimated_time
            routes.append(route_data)
        
        stop_data = stop.to_dict()
        stop_data['routes'] = routes
        
        return jsonify({'stop': stop_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stops_bp.route('/nearby', methods=['GET'])
def get_nearby_stops():
    """
    Trouve les arrêts proches d'une position
    """
    try:
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)
        radius_km = request.args.get('radius', 1.0, type=float)
        limit = request.args.get('limit', 10, type=int)
        
        if latitude is None or longitude is None:
            return jsonify({'error': 'Coordonnées GPS requises'}), 400
        
        # Obtient tous les arrêts actifs
        stops = Stop.query.filter_by(is_active=True).all()
        
        # Calcule les distances et filtre
        nearby_stops = []
        for stop in stops:
            distance = calculate_distance(latitude, longitude, stop.latitude, stop.longitude)
            if distance <= radius_km:
                stop_data = stop.to_dict()
                stop_data['distance_km'] = round(distance, 3)
                nearby_stops.append(stop_data)
        
        # Trie par distance et limite
        nearby_stops.sort(key=lambda x: x['distance_km'])
        nearby_stops = nearby_stops[:limit]
        
        return jsonify({
            'stops': nearby_stops,
            'count': len(nearby_stops),
            'search_center': {'latitude': latitude, 'longitude': longitude},
            'radius_km': radius_km
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stops_bp.route('/<int:stop_id>/predictions', methods=['GET'])
def get_stop_predictions(stop_id):
    """
    Obtient les prédictions d'arrivée pour un arrêt
    """
    try:
        from models import Prediction
        from datetime import datetime, timedelta
        
        stop = Stop.query.get(stop_id)
        if not stop:
            return jsonify({'error': 'Arrêt non trouvé'}), 404
        
        # Obtient les prédictions récentes pour cet arrêt
        predictions = Prediction.query.filter_by(stop_id=stop_id)\
            .filter(Prediction.arrival_time >= datetime.utcnow())\
            .filter(Prediction.created_at >= datetime.utcnow() - timedelta(minutes=10))\
            .order_by(Prediction.arrival_time.asc()).all()
        
        predictions_data = []
        for pred in predictions:
            pred_data = pred.to_dict()
            
            # Calcule l'ETA en minutes
            eta_seconds = (pred.arrival_time - datetime.utcnow()).total_seconds()
            eta_minutes = max(0, int(eta_seconds / 60))
            pred_data['eta_minutes'] = eta_minutes
            
            predictions_data.append(pred_data)
        
        return jsonify({
            'stop_id': stop_id,
            'stop': stop.to_dict(),
            'predictions': predictions_data,
            'count': len(predictions_data),
            'updated_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stops_bp.route('/', methods=['POST'])
def create_stop():
    """
    Crée un nouvel arrêt (admin)
    """
    try:
        data = request.get_json()
        
        required_fields = ['name', 'latitude', 'longitude']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Champs requis manquants'}), 400
        
        # Valide les coordonnées
        from utils.gps_utils import validate_coordinates
        if not validate_coordinates(data['latitude'], data['longitude']):
            return jsonify({'error': 'Coordonnées invalides'}), 400
        
        stop = Stop(
            name=data['name'],
            latitude=data['latitude'],
            longitude=data['longitude'],
            address=data.get('address', ''),
            type=data.get('type', 'regular')
        )
        
        db.session.add(stop)
        db.session.commit()
        
        return jsonify({
            'message': 'Arrêt créé avec succès',
            'stop': stop.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stops_bp.route('/<int:stop_id>', methods=['PUT'])
def update_stop(stop_id):
    """
    Met à jour un arrêt
    """
    try:
        stop = Stop.query.get(stop_id)
        if not stop:
            return jsonify({'error': 'Arrêt non trouvé'}), 404
        
        data = request.get_json()
        
        # Met à jour les champs modifiables
        updateable_fields = ['name', 'latitude', 'longitude', 'address', 'type', 'is_active']
        for field in updateable_fields:
            if field in data:
                if field in ['latitude', 'longitude'] and data[field] is not None:
                    from utils.gps_utils import validate_coordinates
                    if not validate_coordinates(data['latitude'], data['longitude']):
                        return jsonify({'error': 'Coordonnées invalides'}), 400
                setattr(stop, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Arrêt mis à jour',
            'stop': stop.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stops_bp.route('/favorites', methods=['POST'])
def add_favorite():
    """
    Ajoute un arrêt aux favoris d'un utilisateur
    """
    try:
        data = request.get_json()
        
        required_fields = ['user_id', 'stop_id']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'user_id et stop_id requis'}), 400
        
        # Vérifie que l'arrêt existe
        stop = Stop.query.get(data['stop_id'])
        if not stop:
            return jsonify({'error': 'Arrêt non trouvé'}), 404
        
        # Vérifie si déjà en favoris
        existing = UserFavorite.query.filter_by(
            user_id=data['user_id'],
            stop_id=data['stop_id']
        ).first()
        
        if existing:
            return jsonify({'error': 'Arrêt déjà en favoris'}), 409
        
        favorite = UserFavorite(
            user_id=data['user_id'],
            stop_id=data['stop_id'],
            nickname=data.get('nickname')
        )
        
        db.session.add(favorite)
        db.session.commit()
        
        return jsonify({
            'message': 'Arrêt ajouté aux favoris',
            'favorite': favorite.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stops_bp.route('/favorites/<user_id>', methods=['GET'])
def get_user_favorites(user_id):
    """
    Obtient les arrêts favoris d'un utilisateur
    """
    try:
        favorites = UserFavorite.query.filter_by(user_id=user_id)\
            .join(Stop).filter(Stop.is_active == True).all()
        
        return jsonify({
            'favorites': [fav.to_dict() for fav in favorites],
            'count': len(favorites)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stops_bp.route('/favorites/<int:favorite_id>', methods=['DELETE'])
def remove_favorite(favorite_id):
    """
    Supprime un arrêt des favoris
    """
    try:
        favorite = UserFavorite.query.get(favorite_id)
        if not favorite:
            return jsonify({'error': 'Favori non trouvé'}), 404
        
        db.session.delete(favorite)
        db.session.commit()
        
        return jsonify({'message': 'Favori supprimé'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stops_bp.route('/<int:stop_id>', methods=['DELETE'])
def delete_stop(stop_id):
    """
    Supprime un arrêt (désactivation)
    """
    try:
        stop = Stop.query.get(stop_id)
        if not stop:
            return jsonify({'error': 'Arrêt non trouvé'}), 404
        
        # Désactive au lieu de supprimer
        stop.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Arrêt désactivé'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
