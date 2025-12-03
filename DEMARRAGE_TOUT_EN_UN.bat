@echo off
title Test Complet - Bus Tracking System
color 0E

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              🚀 TEST COMPLET DE L'APPLICATION 🚀           ║
echo ║                                                              ║
echo ║  Ce script va :                                             ║
echo ║  1. Vérifier votre installation                             ║
echo ║  2. Lancer l'application                                    ║
echo ║  3. Tester que tout fonctionne                              ║
echo ║  4. Ouvrir votre navigateur automatiquement                ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Appuyez sur une touche pour commencer...
pause >nul

echo [ÉTAPE 1/4] Vérification de l'installation...
call test_automatique.bat

echo.
echo [ÉTAPE 2/4] Démarrage de l'application...
start "" cmd /c start.bat

echo.
echo [ÉTAPE 3/4] Attente du démarrage complet...
echo [INFO] Patientez 30 secondes que tout se lance...
timeout /t 30 /nobreak >nul

echo.
echo [ÉTAPE 4/4] Test automatique de l'API...
call test_api.bat

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                   🌐 OUVERTURE DU NAVIGATEUR                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo [INFO] Ouverture de l'interface de test...

REM Ouvrir l'interface de test principale
start "" "test_interface.html"
timeout /t 3 /nobreak >nul

REM Ouvrir aussi les pages de test directes  
echo [INFO] Ouverture des pages API...
start "" "http://127.0.0.1:5000/api/buses"
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:5000/api/stops"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        🎉 TERMINÉ !                         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Si vous voyez l'interface de test colorée dans votre navigateur,
echo votre application fonctionne parfaitement !
echo.
echo Ce qui s'ouvre automatiquement :
echo ➤ Interface de test interactive (test_interface.html)
echo ➤ API Bus (http://127.0.0.1:5000/api/buses) 
echo ➤ API Arrêts (http://127.0.0.1:5000/api/stops)
echo.
echo Dans l'interface de test, cliquez sur les boutons pour tester !
echo.
echo Pour arrêter l'application plus tard :
echo ➤ Double-cliquez sur stop.bat
echo.
echo Appuyez sur une touche pour fermer cette fenêtre...
pause >nul
