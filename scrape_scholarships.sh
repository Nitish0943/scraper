#!/bin/bash

# Navigate to the directory where the script is located
cd "$(dirname "$0")"

echo "=========================================="
echo "   Scholarship Scraper Automation"
echo "   $(date)"
echo "=========================================="

# 1. Install Node dependencies
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing Node.js dependencies..."
    npm install
else
    echo "[INFO] Dependencies already installed."
fi

# 2. Install Playwright browser (Chromium)
# Check if playwright is installed to avoid repeated downloads if possible, 
# but npx playwright install is usually idempotent and checks version.
echo "[INFO] Ensuring Playwright Chromium is installed..."
npx playwright install chromium

# 3. Create logs folder
if [ ! -d "logs" ]; then
    echo "[INFO] Creating logs directory..."
    mkdir -p logs
fi

# 4. Run Scraper
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/scrape_log_$TIMESTAMP.log"

echo "[INFO] Starting scraper..."
echo "[INFO] Output will be saved to: $LOG_FILE"

# Run the scrape script and redirect both stdout and stderr to the log file
npm run scrape > "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[SUCCESS] Scraping completed successfully."
else
    echo "[ERROR] Scraping failed with exit code $EXIT_CODE. Check logs for details."
fi

echo "=========================================="
