from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import json

db = SQLAlchemy()

class Driver(db.Model):
    __tablename__ = 'drivers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(20), default='active')  # active, inactive
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    buses = db.relationship('Bus', backref='driver', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Route(db.Model):
    __tablename__ = 'routes'
    
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    color = db.Column(db.String(7), default='#2196F3')  # Couleur hex
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    buses = db.relationship('Bus', backref='route', lazy=True)
    route_stops = db.relationship('RouteStop', backref='route', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'number': self.number,
            'name': self.name,
            'description': self.description,
            'color': self.color,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Stop(db.Model):
    __tablename__ = 'stops'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    address = db.Column(db.String(255))
    type = db.Column(db.String(20), default='regular')  # regular, terminal
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    route_stops = db.relationship('RouteStop', backref='stop', lazy=True)
    predictions = db.relationship('Prediction', backref='stop', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'type': self.type,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class RouteStop(db.Model):
    __tablename__ = 'route_stops'
    
    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.Integer, db.ForeignKey('routes.id'), nullable=False)
    stop_id = db.Column(db.Integer, db.ForeignKey('stops.id'), nullable=False)
    sequence = db.Column(db.Integer, nullable=False)  # Ordre dans le trajet
    estimated_time = db.Column(db.Integer, default=0)  # Temps estimé depuis le début (minutes)
    
    def to_dict(self):
        return {
            'id': self.id,
            'route_id': self.route_id,
            'stop_id': self.stop_id,
            'sequence': self.sequence,
            'estimated_time': self.estimated_time,
            'stop': self.stop.to_dict() if self.stop else None
        }

class Bus(db.Model):
    __tablename__ = 'buses'
    
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.String(20), unique=True, nullable=False)
    license_plate = db.Column(db.String(20), unique=True, nullable=False)
    capacity = db.Column(db.Integer, default=50)
    driver_id = db.Column(db.Integer, db.ForeignKey('drivers.id'), nullable=True)
    current_route_id = db.Column(db.Integer, db.ForeignKey('routes.id'), nullable=True)
    status = db.Column(db.String(20), default='inactive')  # active, inactive, maintenance
    is_in_service = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    positions = db.relationship('Position', backref='bus', lazy=True, cascade='all, delete-orphan')
    occupancy_records = db.relationship('Occupancy', backref='bus', lazy=True, cascade='all, delete-orphan')
    predictions = db.relationship('Prediction', backref='bus', lazy=True, cascade='all, delete-orphan')
    trip_history = db.relationship('TripHistory', backref='bus', lazy=True)
    
    def get_current_position(self):
        return Position.query.filter_by(bus_id=self.id).order_by(Position.timestamp.desc()).first()
    
    def get_current_occupancy(self):
        return Occupancy.query.filter_by(bus_id=self.id).order_by(Occupancy.timestamp.desc()).first()
    
    def to_dict(self):
        current_position = self.get_current_position()
        current_occupancy = self.get_current_occupancy()
        
        return {
            'id': self.id,
            'number': self.number,
            'license_plate': self.license_plate,
            'capacity': self.capacity,
            'driver_id': self.driver_id,
            'current_route_id': self.current_route_id,
            'status': self.status,
            'is_in_service': self.is_in_service,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'current_position': current_position.to_dict() if current_position else None,
            'current_occupancy': current_occupancy.to_dict() if current_occupancy else None,
            'driver': self.driver.to_dict() if self.driver else None,
            'route': self.route.to_dict() if self.route else None
        }

class Position(db.Model):
    __tablename__ = 'positions'
    
    id = db.Column(db.Integer, primary_key=True)
    bus_id = db.Column(db.Integer, db.ForeignKey('buses.id'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    speed = db.Column(db.Float, default=0.0)  # km/h
    heading = db.Column(db.Float, default=0.0)  # degrés
    accuracy = db.Column(db.Float, default=0.0)  # mètres
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'bus_id': self.bus_id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'speed': self.speed,
            'heading': self.heading,
            'accuracy': self.accuracy,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class Occupancy(db.Model):
    __tablename__ = 'occupancy'
    
    id = db.Column(db.Integer, primary_key=True)
    bus_id = db.Column(db.Integer, db.ForeignKey('buses.id'), nullable=False)
    passenger_count = db.Column(db.Integer, default=0)
    capacity_percentage = db.Column(db.Float, default=0.0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'bus_id': self.bus_id,
            'passenger_count': self.passenger_count,
            'capacity_percentage': self.capacity_percentage,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

class Prediction(db.Model):
    __tablename__ = 'predictions'
    
    id = db.Column(db.Integer, primary_key=True)
    bus_id = db.Column(db.Integer, db.ForeignKey('buses.id'), nullable=False)
    stop_id = db.Column(db.Integer, db.ForeignKey('stops.id'), nullable=False)
    arrival_time = db.Column(db.DateTime, nullable=False)
    confidence = db.Column(db.Float, default=0.5)  # 0.0 à 1.0
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'bus_id': self.bus_id,
            'stop_id': self.stop_id,
            'arrival_time': self.arrival_time.isoformat() if self.arrival_time else None,
            'confidence': self.confidence,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'bus': self.bus.to_dict() if self.bus else None,
            'stop': self.stop.to_dict() if self.stop else None
        }

class TripHistory(db.Model):
    __tablename__ = 'trip_history'
    
    id = db.Column(db.Integer, primary_key=True)
    bus_id = db.Column(db.Integer, db.ForeignKey('buses.id'), nullable=False)
    route_id = db.Column(db.Integer, db.ForeignKey('routes.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    total_passengers = db.Column(db.Integer, default=0)
    distance_km = db.Column(db.Float, default=0.0)
    average_speed = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'bus_id': self.bus_id,
            'route_id': self.route_id,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_passengers': self.total_passengers,
            'distance_km': self.distance_km,
            'average_speed': self.average_speed,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class UserFavorite(db.Model):
    __tablename__ = 'user_favorites'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False)  # ID unique de l'utilisateur mobile
    stop_id = db.Column(db.Integer, db.ForeignKey('stops.id'), nullable=False)
    nickname = db.Column(db.String(100))  # Nom personnalisé pour l'arrêt
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    stop = db.relationship('Stop', backref='user_favorites')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'stop_id': self.stop_id,
            'nickname': self.nickname,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'stop': self.stop.to_dict() if self.stop else None
        }
