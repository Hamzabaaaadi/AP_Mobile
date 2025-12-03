@echo off
:: Script d'arrêt pour Windows - Bus Tracking System

echo 🛑 Bus Tracking System - Arrêt
echo ==============================

:: Arrêter les processus Python (Backend)
echo 🔄 Arrêt du Backend...
taskkill /f /im python.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Aucun processus Python trouvé
) else (
    echo ✅ Backend arrêté
)

:: Arrêter les processus Node.js (Apps mobiles)
echo 🔄 Arrêt des applications mobiles...
taskkill /f /im node.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Aucun processus Node.js trouvé
) else (
    echo ✅ Applications mobiles arrêtées
)

:: Arrêter Expo CLI si en cours
taskkill /f /im expo.exe >nul 2>&1

echo.
echo 🏁 Système arrêté avec succès!
echo.
pause
