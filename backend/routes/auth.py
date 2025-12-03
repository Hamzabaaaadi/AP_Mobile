from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, get_jwt_identity
from models import db, Driver
from werkzeug.security import check_password_hash

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Connexion chauffeur
    """
    try:
        data = request.get_json()
        
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email et mot de passe requis'}), 400
        
        driver = Driver.query.filter_by(email=data['email']).first()
        
        if not driver or not driver.check_password(data['password']):
            return jsonify({'error': 'Identifiants invalides'}), 401
        
        if driver.status != 'active':
            return jsonify({'error': 'Compte désactivé'}), 401
        
        # Crée le token JWT
        access_token = create_access_token(identity=str(driver.id))
        
        return jsonify({
            'access_token': access_token,
            'driver': driver.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Inscription nouveau chauffeur (pour la démo)
    """
    try:
        data = request.get_json()
        
        required_fields = ['name', 'phone', 'email', 'password']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Tous les champs sont requis'}), 400
        
        # Vérifie si l'email existe déjà
        if Driver.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email déjà utilisé'}), 409
        
        # Vérifie si le téléphone existe déjà
        if Driver.query.filter_by(phone=data['phone']).first():
            return jsonify({'error': 'Numéro de téléphone déjà utilisé'}), 409
        
        # Crée le nouveau chauffeur
        driver = Driver(
            name=data['name'],
            phone=data['phone'],
            email=data['email']
        )
        driver.set_password(data['password'])
        
        db.session.add(driver)
        db.session.commit()
        
        # Crée le token JWT
        access_token = create_access_token(identity=str(driver.id))
        
        return jsonify({
            'access_token': access_token,
            'driver': driver.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_driver():
    """
    Obtient les informations du chauffeur connecté
    """
    try:
        driver_id = get_jwt_identity()
        driver = Driver.query.get(int(driver_id))
        
        if not driver:
            return jsonify({'error': 'Chauffeur non trouvé'}), 404
        
        return jsonify({'driver': driver.to_dict()})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """
    Déconnexion (pour l'instant juste un message de confirmation)
    """
    return jsonify({'message': 'Déconnexion réussie'})

@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    """
    Changement de mot de passe
    """
    try:
        data = request.get_json()
        driver_id = get_jwt_identity()
        
        if not data or not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Mots de passe requis'}), 400
        
        driver = Driver.query.get(int(driver_id))
        if not driver:
            return jsonify({'error': 'Chauffeur non trouvé'}), 404
        
        # Vérifie le mot de passe actuel
        if not driver.check_password(data['current_password']):
            return jsonify({'error': 'Mot de passe actuel incorrect'}), 401
        
        # Met à jour le mot de passe
        driver.set_password(data['new_password'])
        db.session.commit()
        
        return jsonify({'message': 'Mot de passe mis à jour'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
