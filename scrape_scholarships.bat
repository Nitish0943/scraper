@echo off
:: Navigate to the script's directory
cd /d "%~dp0"

echo ==========================================
echo    Scholarship Scraper Automation (Windows)
echo    %DATE% %TIME%
echo ==========================================

:: Check if logs folder exists
if not exist "logs" mkdir logs

:: Generate timestamp for log file
set "TIMESTAMP=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%_%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%"
set "TIMESTAMP=%TIMESTAMP: =0%"
set "LOG_FILE=logs\scrape_log_%TIMESTAMP%.log"

echo [INFO] Starting scraper...
echo [INFO] Output will be saved to: %LOG_FILE%

:: Run the scraper and log output
call npm run scrape > "%LOG_FILE%" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Scraping completed successfully.
) else (
    echo [ERROR] Scraping failed. Check logs for details.
)

echo ==========================================
