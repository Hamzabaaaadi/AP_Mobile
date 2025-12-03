@echo off
title Test de l'Application Bus - Verification Automatique
color 0A
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    TEST AUTOMATIQUE                         ║
echo ║              Application de Suivi de Bus                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Attendre que le serveur soit prêt
echo [INFO] Attente que le serveur soit prêt...
timeout /t 10 /nobreak >nul

REM Tester l'API avec curl (ou PowerShell si curl n'est pas disponible)
echo [TEST] Vérification de l'API...

REM Utiliser PowerShell pour tester l'API
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/buses' -Method GET; Write-Host '[SUCCESS] API répond correctement !'; Write-Host 'Nombre de bus trouvés:' $response.Count; } catch { Write-Host '[ERREUR] API ne répond pas' }"

echo.
echo [TEST] Autres endpoints...

powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/stops' -Method GET; Write-Host '[SUCCESS] Endpoint stops OK - Arrêts trouvés:' $response.Count; } catch { Write-Host '[ERREUR] Endpoint stops KO' }"

powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:5000/api/stops/1/predictions' -Method GET; Write-Host '[SUCCESS] Endpoint predictions OK'; } catch { Write-Host '[ERREUR] Endpoint predictions KO' }"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                        RÉSULTATS                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Si vous voyez [SUCCESS] ci-dessus, votre application fonctionne !
echo.
echo Vous pouvez maintenant ouvrir votre navigateur et aller sur :
echo ➤ http://127.0.0.1:5000/api/buses
echo ➤ http://127.0.0.1:5000/api/stops
echo.
echo Appuyez sur une touche pour fermer cette fenêtre...
pause >nul
