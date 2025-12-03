@echo off
title Bus Tracking System - Démarrage
color 0B

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║               � BUS TRACKING SYSTEM 🚌                    ║
echo ║                      DÉMARRAGE                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [INFO] Vérification des prérequis...

:: Vérification Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Python n'est pas installé ou pas dans le PATH
    echo [SOLUTION] Installez Python depuis https://www.python.org/downloads/
    echo [IMPORTANT] Cochez "Add Python to PATH" lors de l'installation
    pause
    exit /b 1
)
echo [OK] Python trouvé

:: Vérification Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installé ou pas dans le PATH
    echo [SOLUTION] Installez Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js trouvé

echo [OK] Tous les prérequis sont installés !

:: Création du dossier de logs
if not exist logs mkdir logs

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                   DÉMARRAGE DU BACKEND                      ║
echo ╚══════════════════════════════════════════════════════════════╝

:: 1. Démarrage du Backend
echo [1/3] Démarrage du Backend...
cd backend

:: Installation des dépendances Python
echo [INFO] Installation/vérification des dépendances Python...
pip install -r requirements.txt >nul 2>&1

if errorlevel 1 (
    echo [ERREUR] Impossible d'installer les dépendances Python
    echo [SOLUTION] Vérifiez votre connexion internet et les permissions
    pause
    exit /b 1
)
echo [OK] Dépendances Python installées

:: Démarrage du backend en arrière-plan
echo [INFO] Lancement du serveur Backend sur http://127.0.0.1:5000...
start /B python app.py

:: Attendre que le serveur soit prêt
echo [INFO] Attente du démarrage complet (10 secondes)...
timeout /t 10 /nobreak >nul

:: Test du backend
curl -s http://localhost:5000/api/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Backend en cours de démarrage...
    timeout /t 5 /nobreak >nul
) else (
    echo ✅ Backend accessible
)

cd ..

:: 2. Configuration des Apps Mobiles
echo.
echo 2️⃣ Configuration des applications mobiles...

:: App Utilisateur
echo 📱 Configuration App Utilisateur...
cd mobile-user

echo 📦 Installation dépendances App Utilisateur...
call npm install
if errorlevel 1 (
    echo ❌ Erreur installation dépendances App Utilisateur
    cd ..
    pause
    exit /b 1
)

echo ✅ App Utilisateur configurée
cd ..

:: App Chauffeur
echo 🚗 Configuration App Chauffeur...
cd mobile-driver

echo 📦 Installation dépendances App Chauffeur...
call npm install
if errorlevel 1 (
    echo ❌ Erreur installation dépendances App Chauffeur
    cd ..
    pause
    exit /b 1
)

echo ✅ App Chauffeur configurée
cd ..

:: 3. Résumé et instructions
echo.
echo 🎉 SYSTÈME PRÊT!
echo ===============
echo.
echo 📡 Backend API: http://localhost:5000
echo 📊 Health Check: http://localhost:5000/api/health
echo 📈 Statistiques: http://localhost:5000/api/stats
echo.
echo 📱 Pour démarrer les applications mobiles:
echo.
echo    App Utilisateur:
echo    cd mobile-user
echo    npm start
echo.
echo    App Chauffeur:
echo    cd mobile-driver  
echo    npm start
echo.
echo 🔐 Comptes de test (Chauffeurs):
echo    Email: jean.dupont@buscompany.com
echo    Mot de passe: password123
echo.
echo    Email: marie.martin@buscompany.com
echo    Mot de passe: password123
echo.
echo 📖 Consultez README.md pour plus d'informations
echo.

:: Proposer de démarrer les apps
set /p choice="Voulez-vous démarrer les applications mobiles maintenant? (o/N): "
if /i "%choice%"=="o" (
    echo.
    echo 🚀 Démarrage des applications mobiles...
    
    :: Démarrer l'app utilisateur
    start "App Utilisateur" cmd /k "cd mobile-user && npm start"
    
    :: Attendre un peu
    timeout /t 3 /nobreak >nul
    
    :: Démarrer l'app chauffeur
    start "App Chauffeur" cmd /k "cd mobile-driver && npm start"
    
    echo ✅ Applications démarrées dans de nouvelles fenêtres
)

echo.
echo ✨ Développement en cours! Appuyez sur une touche pour continuer...
pause >nul
