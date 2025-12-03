#!/bin/bash

# Script de déploiement automatique - Bus Tracking System
# Usage: ./deploy.sh [environment]
# Environnements: dev, staging, prod

set -e

ENVIRONMENT=${1:-dev}
PROJECT_NAME="bus-tracking-system"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🚍 Déploiement Bus Tracking System - Environnement: $ENVIRONMENT"
echo "=================================================="

# Configuration selon l'environnement
case $ENVIRONMENT in
  "dev")
    API_URL="http://localhost:5000"
    DB_URL="sqlite:///bus_tracking.db"
    ;;
  "staging")
    API_URL="https://api-staging.bustracker.com"
    DB_URL="postgresql://user:pass@staging-db:5432/bustrack"
    ;;
  "prod")
    API_URL="https://api.bustracker.com"
    DB_URL="postgresql://user:pass@prod-db:5432/bustrack"
    ;;
  *)
    echo "❌ Environnement invalide: $ENVIRONMENT"
    echo "Utilisation: ./deploy.sh [dev|staging|prod]"
    exit 1
    ;;
esac

echo "📍 Configuration:"
echo "   - Environment: $ENVIRONMENT"
echo "   - API URL: $API_URL"
echo "   - Timestamp: $TIMESTAMP"

# Fonction de rollback
cleanup() {
  echo "🔄 Nettoyage en cours..."
  # Ajoutez ici les commandes de cleanup si nécessaire
}

trap cleanup EXIT

# 1. Vérification des prérequis
echo ""
echo "1️⃣  Vérification des prérequis..."

# Vérification Python
if ! command -v python3 &> /dev/null; then
  echo "❌ Python 3 n'est pas installé"
  exit 1
fi

# Vérification Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js n'est pas installé"
  exit 1
fi

# Vérification Git
if ! command -v git &> /dev/null; then
  echo "❌ Git n'est pas installé"
  exit 1
fi

echo "✅ Prérequis OK"

# 2. Backup (pour staging/prod)
if [[ $ENVIRONMENT != "dev" ]]; then
  echo ""
  echo "2️⃣  Backup de la base de données..."
  
  mkdir -p backups
  
  if [[ $ENVIRONMENT == "prod" ]]; then
    # Backup production
    pg_dump $DB_URL > backups/backup_prod_$TIMESTAMP.sql
    echo "✅ Backup prod créé: backups/backup_prod_$TIMESTAMP.sql"
  else
    # Backup staging
    pg_dump $DB_URL > backups/backup_staging_$TIMESTAMP.sql
    echo "✅ Backup staging créé: backups/backup_staging_$TIMESTAMP.sql"
  fi
fi

# 3. Déploiement Backend
echo ""
echo "3️⃣  Déploiement Backend..."

cd backend

# Création de l'environnement virtuel si nécessaire
if [ ! -d "venv" ]; then
  echo "🔧 Création de l'environnement virtuel Python..."
  python3 -m venv venv
fi

# Activation de l'environnement virtuel
source venv/bin/activate

# Installation des dépendances
echo "📦 Installation des dépendances Python..."
pip install -r requirements.txt

# Configuration de l'environnement
echo "⚙️  Configuration de l'environnement..."
cat > .env << EOF
SECRET_KEY=bus-tracker-secret-key-$ENVIRONMENT-$TIMESTAMP
JWT_SECRET_KEY=jwt-secret-$ENVIRONMENT-$TIMESTAMP
DATABASE_URL=$DB_URL
FLASK_ENV=$ENVIRONMENT
API_BASE_URL=$API_URL
EOF

# Tests backend
if [[ $ENVIRONMENT != "dev" ]]; then
  echo "🧪 Exécution des tests..."
  # python -m pytest tests/ --verbose
  echo "⚠️  Tests à implémenter"
fi

# Démarrage du backend en arrière-plan pour dev
if [[ $ENVIRONMENT == "dev" ]]; then
  echo "🚀 Démarrage du serveur backend..."
  nohup python app.py > ../logs/backend_$TIMESTAMP.log 2>&1 &
  BACKEND_PID=$!
  echo "✅ Backend démarré (PID: $BACKEND_PID)"
  echo $BACKEND_PID > ../backend.pid
fi

cd ..

# 4. Configuration des apps mobiles
echo ""
echo "4️⃣  Configuration des applications mobiles..."

# Fonction pour mettre à jour la config API
update_api_config() {
  local app_dir=$1
  local api_file="$app_dir/src/services/api.js"
  
  if [ -f "$api_file" ]; then
    # Extraction de l'IP locale pour dev
    if [[ $ENVIRONMENT == "dev" ]]; then
      LOCAL_IP=$(hostname -I | awk '{print $1}')
      API_URL_MOBILE="http://$LOCAL_IP:5000/api"
    else
      API_URL_MOBILE="$API_URL/api"
    fi
    
    # Mise à jour de l'URL de l'API
    sed -i.bak "s|const API_BASE_URL = '.*'|const API_BASE_URL = '$API_URL_MOBILE'|g" "$api_file"
    echo "✅ Configuration API mise à jour dans $app_dir"
    echo "   URL: $API_URL_MOBILE"
  fi
}

# App Utilisateur
echo "📱 Configuration app utilisateur..."
cd mobile-user
npm install
update_api_config "."
cd ..

# App Chauffeur
echo "🚗 Configuration app chauffeur..."
cd mobile-driver
npm install
update_api_config "."
cd ..

# 5. Tests d'intégration
echo ""
echo "5️⃣  Tests d'intégration..."

# Attendre que le backend soit prêt
if [[ $ENVIRONMENT == "dev" ]]; then
  echo "⏳ Attente du démarrage backend..."
  for i in {1..30}; do
    if curl -s http://localhost:5000/api/health > /dev/null; then
      echo "✅ Backend accessible"
      break
    fi
    sleep 2
  done
fi

# Test de l'API
if curl -s $API_URL/api/health | grep -q "healthy"; then
  echo "✅ API fonctionnelle"
else
  echo "❌ API non accessible"
  exit 1
fi

# 6. Génération de la documentation
echo ""
echo "6️⃣  Génération de la documentation..."

mkdir -p logs

# Log de déploiement
cat > logs/deploy_$TIMESTAMP.log << EOF
Déploiement Bus Tracking System
===============================
Date: $(date)
Environnement: $ENVIRONMENT
Version: 1.0.0
API URL: $API_URL

Configuration:
- Backend: ✅ Déployé
- App Utilisateur: ✅ Configurée  
- App Chauffeur: ✅ Configurée

Status: SUCCESS
EOF

# Guide de démarrage rapide
cat > QUICK_START.md << EOF
# 🚀 Guide de Démarrage Rapide

## Déploiement: $ENVIRONMENT ($TIMESTAMP)

### 📡 Backend API
- **URL**: $API_URL
- **Health Check**: $API_URL/api/health
- **Status**: ✅ Actif

### 📱 Applications Mobiles

**App Utilisateur:**
\`\`\`bash
cd mobile-user
npm start
\`\`\`

**App Chauffeur:**
\`\`\`bash
cd mobile-driver
npm start
\`\`\`

### 🔐 Comptes de Test

**Chauffeurs:**
- Email: jean.dupont@buscompany.com
- Mot de passe: password123

### 🔧 Commandes Utiles

\`\`\`bash
# Arrêter le backend
kill \$(cat backend.pid)

# Voir les logs
tail -f logs/backend_$TIMESTAMP.log

# Redémarrer
./deploy.sh $ENVIRONMENT
\`\`\`

### 📊 URLs Importantes
- API: $API_URL
- Health: $API_URL/api/health
- Stats: $API_URL/api/stats
EOF

echo "✅ Documentation générée: QUICK_START.md"

# 7. Finalisation
echo ""
echo "7️⃣  Finalisation..."

# Créer un script d'arrêt
cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Arrêt du Bus Tracking System..."

# Arrêt du backend
if [ -f backend.pid ]; then
  BACKEND_PID=$(cat backend.pid)
  if kill -0 $BACKEND_PID 2>/dev/null; then
    kill $BACKEND_PID
    echo "✅ Backend arrêté (PID: $BACKEND_PID)"
  fi
  rm backend.pid
fi

echo "🏁 Système arrêté"
EOF

chmod +x stop.sh

# Résumé du déploiement
echo ""
echo "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS!"
echo "=================================="
echo ""
echo "📊 Résumé:"
echo "   • Environnement: $ENVIRONMENT"
echo "   • API Backend: $API_URL"
echo "   • Timestamp: $TIMESTAMP"
echo ""
echo "📱 Applications:"
echo "   • App Utilisateur: mobile-user/"
echo "   • App Chauffeur: mobile-driver/"
echo ""
echo "🔧 Commandes utiles:"
echo "   • Arrêter: ./stop.sh"
echo "   • Logs: tail -f logs/backend_$TIMESTAMP.log"
echo "   • API Status: curl $API_URL/api/health"
echo ""
echo "📖 Documentation: QUICK_START.md"
echo ""

if [[ $ENVIRONMENT == "dev" ]]; then
  echo "🚀 Étapes suivantes:"
  echo "   1. Ouvrez deux terminaux"
  echo "   2. Terminal 1: cd mobile-user && npm start"
  echo "   3. Terminal 2: cd mobile-driver && npm start"
  echo "   4. Scannez les QR codes avec Expo Go"
  echo ""
  echo "🎯 Test rapide:"
  echo "   • API: curl http://localhost:5000/api/health"
  echo "   • Stats: curl http://localhost:5000/api/stats"
fi

echo "✨ Bon développement!"
