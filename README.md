# 🚍 Bus Tracking System

## Vue d'ensemble

Système complet de suivi intelligent de bus en temps réel comprenant:

- **Backend API** (Flask/Python)
- **Application Utilisateur** (React Native/Expo)
- **Application Chauffeur** (React Native/Expo)

## 📁 Structure du Projet

```
bus-tracking-system/
├── backend/                 # API Backend Flask
│   ├── app.py              # Application principale
│   ├── config.py           # Configuration
│   ├── models/             # Modèles de données
│   ├── routes/             # Endpoints API
│   ├── utils/              # Utilitaires et algorithmes
│   └── requirements.txt    # Dépendances Python
├── mobile-user/            # App React Native (Utilisateurs)
│   ├── src/               # Code source
│   ├── App.js             # Composant principal
│   └── package.json       # Dépendances Node.js
├── mobile-driver/         # App React Native (Chauffeurs)
│   ├── src/               # Code source
│   ├── App.js             # Composant principal
│   └── package.json       # Dépendances Node.js
└── documentation/         # Documentation et guides
```

## 🚀 Installation et Configuration

### Prérequis

- Python 3.8+
- Node.js 18+
- Expo CLI
- Git

### 1. Backend (API)

```bash
cd backend

# Installation des dépendances
pip install -r requirements.txt

# Configuration de l'environnement
cp .env.example .env
# Éditer le fichier .env selon vos besoins

# Initialisation de la base de données
python app.py

# Le serveur démarre sur http://localhost:5000
```

### 2. Application Utilisateur

```bash
cd mobile-user

# Installation des dépendances
npm install

# Configuration de l'API
# Modifier l'URL de l'API dans src/services/api.js
# Remplacer 192.168.1.100 par l'IP de votre serveur backend

# Démarrage en développement
npm start
```

### 3. Application Chauffeur

```bash
cd mobile-driver

# Installation des dépendances
npm install

# Configuration de l'API
# Modifier l'URL de l'API dans src/services/api.js

# Démarrage en développement
npm start
```

## 🔧 Configuration

### Variables d'Environnement (Backend)

Créer un fichier `.env` dans le dossier `backend/`:

```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
DATABASE_URL=sqlite:///bus_tracking.db
FLASK_ENV=development
```

### Configuration API (Apps Mobile)

Dans les deux applications mobiles, modifier l'URL de l'API:

**Fichiers à modifier:**
- `mobile-user/src/services/api.js`
- `mobile-driver/src/services/api.js`

```javascript
const API_BASE_URL = 'http://VOTRE-IP:5000/api';
```

## 📱 Fonctionnalités

### Application Utilisateur

- **Carte en temps réel** avec positions des bus
- **Prédictions d'arrivée** précises
- **Niveau d'occupation** des bus
- **Recherche d'arrêts** et favoris
- **Notifications** d'arrivée
- **Interface intuitive** et responsive

### Application Chauffeur

- **Tableau de bord** complet
- **Suivi GPS automatique** (foreground/background)
- **Gestion de l'occupation** (comptage passagers)
- **Statut de service** (en service/hors service)
- **Synchronisation offline** des données

### Backend API

- **API RESTful** complète
- **Authentification JWT** pour chauffeurs
- **Algorithmes de prédiction** intelligents
- **WebSockets** pour temps réel
- **Base de données** optimisée

## 🔐 Authentification

### Chauffeurs (Comptes de Test)

```
Email: jean.dupont@buscompany.com
Mot de passe: password123

Email: marie.martin@buscompany.com  
Mot de passe: password123
```

### Utilisateurs

L'app utilisateur génère automatiquement un ID unique anonyme.

## 📊 Données de Test

Le système s'initialise avec des données de démonstration:

- **2 chauffeurs** de test
- **2 lignes de bus** (Centre-ville ↔ Université, Gare ↔ Hôpital)
- **6 arrêts** dans Toulouse
- **2 bus** assignés aux chauffeurs

## 🌐 Déploiement

### Développement Local

1. Lancez le backend: `python backend/app.py`
2. Lancez les apps mobiles: `npm start` dans chaque dossier
3. Utilisez Expo Go pour tester sur téléphone

### Production

**Backend:**
- Déployez sur Heroku, AWS, ou serveur VPS
- Configurez PostgreSQL en production
- Activez HTTPS

**Apps Mobile:**
- Build avec `expo build:android` / `expo build:ios`
- Publiez sur Google Play / App Store

## 🔧 API Documentation

### Endpoints Principaux

```
GET  /api/health              # Health check
GET  /api/stats               # Statistiques système

POST /api/auth/login          # Connexion chauffeur
GET  /api/auth/me            # Profil chauffeur

GET  /api/buses/active        # Bus en service
GET  /api/buses/{id}         # Détails bus

POST /api/positions          # Envoyer position GPS
GET  /api/positions/current  # Positions actuelles

GET  /api/stops              # Liste arrêts
GET  /api/stops/{id}/predictions  # Prédictions arrêt

POST /api/occupancy          # Mettre à jour occupation
GET  /api/occupancy/stats    # Stats occupation globales
```

### Format des Données

**Position GPS:**
```json
{
  "bus_id": 1,
  "latitude": 43.6047,
  "longitude": 1.4442,
  "speed": 25.5,
  "heading": 180,
  "accuracy": 5
}
```

**Prédiction:**
```json
{
  "bus_id": 1,
  "stop_id": 1,
  "arrival_time": "2024-01-15T14:30:00Z",
  "eta_minutes": 5,
  "confidence": 0.85
}
```

## 🧪 Tests

### Tests Manuels

1. **Connexion chauffeur** avec comptes de test
2. **Activation du service** sur un bus
3. **Simulation GPS** (si pas de vraie position)
4. **Vérification temps réel** dans l'app utilisateur
5. **Gestion occupation** (ajouter/retirer passagers)

### Tests Automatisés

```bash
# Backend
cd backend
python -m pytest tests/

# Mobile (si configuré)
cd mobile-user
npm test
```

## 🐛 Troubleshooting

### Problèmes Courants

**Backend ne démarre pas:**
- Vérifiez Python 3.8+
- Installez les dépendances: `pip install -r requirements.txt`
- Vérifiez les permissions du fichier de DB

**Apps mobiles ne se connectent pas:**
- Vérifiez l'URL de l'API (IP locale)
- Assurez-vous que le backend est accessible
- Testez avec Postman: `GET http://VOTRE-IP:5000/api/health`

**GPS ne fonctionne pas:**
- Accordez les permissions de localisation
- Testez sur un vrai appareil (pas simulateur)
- Vérifiez les logs de l'application

**Prédictions incohérentes:**
- Attendez quelques positions GPS pour calibrage
- Vérifiez la configuration des lignes/arrêts
- Consultez les logs backend pour erreurs

### Logs et Debug

**Backend:**
```bash
# Mode debug
export FLASK_ENV=development
python app.py
```

**Mobile:**
```bash
# Voir les logs
expo start --dev-client
# Ou utiliser React Native Debugger
```

## 🔮 Améliorations Futures

### Phase 2 - Fonctionnalités Avancées
- [ ] Notifications push
- [ ] Mode hors ligne amélioré
- [ ] Interface administrateur web
- [ ] Analytics et rapports détaillés
- [ ] Intégration API météo
- [ ] Optimisation algorithmes ML

### Phase 3 - Scaling
- [ ] Microservices architecture
- [ ] Base de données distribuée
- [ ] Cache Redis
- [ ] CDN pour assets statiques
- [ ] Monitoring avancé (Prometheus/Grafana)

## 👥 Support

### Contact
- **Email**: support@bustracker.com
- **Documentation**: [Wiki du projet]
- **Issues**: [GitHub Issues]

### Contribution
1. Fork le repository
2. Créer une branche feature
3. Commit des changements
4. Push vers la branche
5. Créer une Pull Request

---

**Version 1.0.0** - Système opérationnel pour démonstration et tests.

*Développé avec ❤️ pour optimiser les transports en commun*
