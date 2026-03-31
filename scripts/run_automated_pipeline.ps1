# Automated Reliability Pipeline for Windows (PowerShell)

Write-Host "--- [1] Dataset Management: Generating mock dataset ---" -ForegroundColor Cyan
python testing/scripts/dataset_loader.py

Write-Host "--- [2] AI/ML Validation: Running accuracy and metrics tests ---" -ForegroundColor Cyan
python testing/scripts/ml_validator.py

Write-Host "--- [3] API Testing: Running Jest/Supertest suite ---" -ForegroundColor Cyan
Set-Location backend
npm test
Set-Location ..

Write-Host "--- [4] Database Automation: Running MongoDB integrity checks ---" -ForegroundColor Cyan
node testing/scripts/db_validator.js

Write-Host "--- [5] Generating Visual Report ---" -ForegroundColor Cyan
python testing/scripts/report_generator.py

Write-Host "--- [6] Pipeline Execution Complete: Check logs/ and testing/reports/ for details ---" -ForegroundColor Green
