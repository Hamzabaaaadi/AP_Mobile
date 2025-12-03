$env:PYTHONIOENCODING = 'utf-8'
Set-Location $PSScriptRoot
python app.py > backend_log.txt 2> backend_err.txt
