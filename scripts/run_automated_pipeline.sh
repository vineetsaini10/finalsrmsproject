#!/bin/bash

# Ensure we're in the app root
cd /app

echo "--- [1] Dataset Management: Generating mock dataset ---"
python3 testing/scripts/dataset_loader.py

echo "--- [2] AI/ML Validation: Running accuracy and metrics tests ---"
python3 testing/scripts/ml_validator.py

echo "--- [3] API Testing: Running Jest/Supertest suite ---"
cd /app/backend
npm test

echo "--- [4] Database Automation: Running MongoDB integrity checks ---"
cd /app
node testing/scripts/db_validator.js

echo "--- [5] Pipeline Execution Complete: Check logs/ and testing/reports/ for details ---"
