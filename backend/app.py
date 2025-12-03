import os
import threading
import time
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
from config import Config
from models import db
from routes.auth import auth_bp
from routes.buses import buses_bp
from routes.positions import positions_bp
from routes.stops import stops_bp
from routes.occupancy import occupancy_bp
from utils.predictions import PredictionEngine

def create_app(config_class=Config):
    """Factory pour créer l'application Flask"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)
    CORS(app)
    socketio = SocketIO(app, cors_allowed_origins="*")
    
    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(buses_bp, url_prefix='/api/buses')
    app.register_blueprint(positions_bp, url_prefix='/api/positions')
    app.register_blueprint(stops_bp, url_prefix='/api/stops')
    app.register_blueprint(occupancy_bp, url_prefix='/api/occupancy')
    
    # Routes principales
    @app.route('/')
    def index():
        return jsonify({
            'message': '🚍 Bus Tracking System API',
            'version': '1.0.0',
            'status': 'active',
            'endpoints': {
                'auth': '/api/auth',
                'buses': '/api/buses',
                'positions': '/api/positions',
                'stops': '/api/stops',
                'occupancy': '/api/occupancy'
            }
        })
    
    @app.route('/api/health')
    def health_check():
        """Health check endpoint"""
        try:
            # Test connexion DB
            db.session.execute('SELECT 1')
            db_status = 'connected'
        except:
            db_status = 'disconnected'
        
        return jsonify({
            'status': 'healthy',
            'database': db_status,
            'timestamp': time.time()
        })
    
    @app.route('/api/stats')
    def get_system_stats():
        """Statistiques globales du système"""
        try:
            from models import Bus, Stop, Driver, Position
            from datetime import datetime, timedelta
            
            # Compteurs de base
            total_buses = Bus.query.count()
            active_buses = Bus.query.filter_by(is_in_service=True).count()
            total_stops = Stop.query.filter_by(is_active=True).count()
            total_drivers = Driver.query.filter_by(status='active').count()
            
            # Positions récentes (dernière heure)
            recent_positions = Position.query.filter(
                Position.timestamp >= datetime.utcnow() - timedelta(hours=1)
            ).count()
            
            return jsonify({
                'buses': {
                    'total': total_buses,
                    'active': active_buses,
                    'inactive': total_buses - active_buses
                },
                'stops': {
                    'total': total_stops
                },
                'drivers': {
                    'total': total_drivers
                },
                'activity': {
                    'positions_last_hour': recent_positions
                },
                'timestamp': datetime.utcnow().isoformat()
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    # WebSocket events
    @socketio.on('connect')
    def handle_connect():
        print('Client connecté via WebSocket')
    
    @socketio.on('disconnect')
    def handle_disconnect():
        print('Client déconnecté du WebSocket')
    
    @socketio.on('subscribe_bus')
    def handle_subscribe_bus(data):
        """S'abonne aux mises à jour d'un bus spécifique"""
        bus_id = data.get('bus_id')
        if bus_id:
            print(f'Abonnement aux mises à jour du bus {bus_id}')
            # Logique d'abonnement à implémenter
    
    # Gestionnaire d'erreur JWT
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token expiré'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Token invalide'}), 401
    
    # Task de mise à jour des prédictions en arrière-plan
    def prediction_updater():
        """Mise à jour périodique des prédictions"""
        while True:
            try:
                with app.app_context():
                    print("Mise à jour des prédictions...")
                    PredictionEngine.update_all_predictions()
                    print("Prédictions mises à jour")
            except Exception as e:
                print(f"Erreur mise à jour prédictions: {e}")

            # Attend 2 minutes avant la prochaine mise à jour
            time.sleep(120)
    
    # Lance le thread de mise à jour des prédictions
    prediction_thread = threading.Thread(target=prediction_updater, daemon=True)
    prediction_thread.start()
    
    # Store socketio instance in app for use in other modules
    app.socketio = socketio
    
    return app, socketio

def init_database(app):
    """Initialise la base de données avec des données de test"""
    with app.app_context():
        try:
            # Crée les tables
            db.create_all()
            
            # Vérifie si des données existent déjà
            from models import Driver, Route, Stop, Bus, RouteStop
            
            if Driver.query.count() == 0:
                print("Initialisation de la base de données...")
                
                # Chauffeurs de test
                driver1 = Driver(
                    name="Jean Dupont",
                    phone="+33123456789",
                    email="jean.dupont@buscompany.com"
                )
                driver1.set_password("password123")
                
                driver2 = Driver(
                    name="Marie Martin", 
                    phone="+33987654321",
                    email="marie.martin@buscompany.com"
                )
                driver2.set_password("password123")
                
                db.session.add(driver1)
                db.session.add(driver2)
                
                # Lignes de test
                route1 = Route(
                    number="1",
                    name="Centre-ville ⇄ Université",
                    description="Ligne reliant le centre-ville au campus universitaire",
                    color="#2196F3"
                )
                
                route2 = Route(
                    number="2", 
                    name="Gare ⇄ Hôpital",
                    description="Ligne desservant la gare et le centre hospitalier",
                    color="#4CAF50"
                )
                
                db.session.add(route1)
                db.session.add(route2)
                db.session.commit()
                
                # Arrêts de test (exemple pour une ville)
                stops_data = [
                    {"name": "Centre-ville", "lat": 43.6047, "lon": 1.4442, "type": "terminal"},
                    {"name": "Place du Capitole", "lat": 43.6043, "lon": 1.4437, "type": "regular"},
                    {"name": "Université Paul Sabatier", "lat": 43.5618, "lon": 1.4673, "type": "terminal"},
                    {"name": "Gare Matabiau", "lat": 43.6108, "lon": 1.4537, "type": "terminal"},
                    {"name": "CHU Purpan", "lat": 43.6263, "lon": 1.4050, "type": "regular"},
                    {"name": "Métro Jeanne d'Arc", "lat": 43.6007, "lon": 1.4359, "type": "regular"}
                ]
                
                stops = []
                for stop_data in stops_data:
                    stop = Stop(
                        name=stop_data["name"],
                        latitude=stop_data["lat"],
                        longitude=stop_data["lon"],
                        type=stop_data["type"],
                        address=f"Adresse de {stop_data['name']}"
                    )
                    stops.append(stop)
                    db.session.add(stop)
                
                db.session.commit()
                
                # Associe les arrêts aux lignes
                # Ligne 1: Centre-ville -> Université
                route_stops_1 = [
                    {"route_id": route1.id, "stop_id": stops[0].id, "sequence": 1, "time": 0},
                    {"route_id": route1.id, "stop_id": stops[1].id, "sequence": 2, "time": 3},
                    {"route_id": route1.id, "stop_id": stops[5].id, "sequence": 3, "time": 8},
                    {"route_id": route1.id, "stop_id": stops[2].id, "sequence": 4, "time": 15}
                ]
                
                # Ligne 2: Gare -> Hôpital  
                route_stops_2 = [
                    {"route_id": route2.id, "stop_id": stops[3].id, "sequence": 1, "time": 0},
                    {"route_id": route2.id, "stop_id": stops[1].id, "sequence": 2, "time": 5},
                    {"route_id": route2.id, "stop_id": stops[0].id, "sequence": 3, "time": 8},
                    {"route_id": route2.id, "stop_id": stops[4].id, "sequence": 4, "time": 20}
                ]
                
                for rs_data in route_stops_1 + route_stops_2:
                    route_stop = RouteStop(
                        route_id=rs_data["route_id"],
                        stop_id=rs_data["stop_id"],
                        sequence=rs_data["sequence"],
                        estimated_time=rs_data["time"]
                    )
                    db.session.add(route_stop)
                
                # Bus de test
                bus1 = Bus(
                    number="101",
                    license_plate="AB-123-CD",
                    capacity=50,
                    driver_id=driver1.id,
                    current_route_id=route1.id,
                    status="active"
                )
                
                bus2 = Bus(
                    number="201", 
                    license_plate="EF-456-GH",
                    capacity=40,
                    driver_id=driver2.id,
                    current_route_id=route2.id,
                    status="active"
                )
                
                db.session.add(bus1)
                db.session.add(bus2)
                
                db.session.commit()
                
                print("Base de données initialisée avec des données de test")
                print("Comptes de test:")
                print("   Chauffeur 1: jean.dupont@buscompany.com / password123")
                print("   Chauffeur 2: marie.martin@buscompany.com / password123")
                
            else:
                print("Base de données déjà initialisée")

        except Exception as e:
            print(f"Erreur initialisation DB: {e}")
            db.session.rollback()

if __name__ == '__main__':
    # Crée l'application
    app, socketio = create_app()
    
    # Initialise la base de données
    init_database(app)
    
    # Lance le serveur
    print("Démarrage du serveur Bus Tracking System...")
    print("API disponible sur: http://localhost:5000")
    print("WebSocket disponible sur: ws://localhost:5000")
    
    # Mode debug pour le développement
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
