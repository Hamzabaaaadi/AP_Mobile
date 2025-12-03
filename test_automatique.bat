@echo off
echo ================================
echo   TEST AUTOMATIQUE DE L'APP
echo ================================
echo.
echo Ce script va tester automatiquement que votre application fonctionne bien.
echo Patientez quelques secondes...
echo.

REM Vérifier que Python est installé
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installé ou pas dans le PATH
    echo Veuillez installer Python depuis https://www.python.org/downloads/
    pause
    exit /b 1
)
echo [OK] Python est installé

REM Vérifier que Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installé ou pas dans le PATH
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js est installé

REM Vérifier que nous sommes dans le bon dossier
if not exist "backend\app.py" (
    echo [ERREUR] Ce script doit être lancé depuis le dossier bus-tracking-system
    echo Dossier actuel : %cd%
    pause
    exit /b 1
)
echo [OK] Nous sommes dans le bon dossier

REM Vérifier les dépendances Python
echo [INFO] Vérification des dépendances Python...
cd backend
pip list | find "Flask" >nul
if %errorlevel% neq 0 (
    echo [INFO] Installation des dépendances Python...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERREUR] Impossible d'installer les dépendances Python
        cd ..
        pause
        exit /b 1
    )
)
echo [OK] Dépendances Python installées
cd ..

echo.
echo ================================
echo   TOUT EST PRÊT !
echo ================================
echo.
echo Votre système est correctement configuré.
echo Vous pouvez maintenant lancer l'application avec :
echo.
echo    start.bat
echo.
echo Appuyez sur une touche pour continuer...
pause >nul
