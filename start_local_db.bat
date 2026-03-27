@echo off
setlocal

set "ROOT=%~dp0"
set "DBPATH=%ROOT%backend\.local\mongodb\data"
set "LOGPATH=%ROOT%backend\.local\mongodb\mongod.log"
set "MONGOD_EXE="

if exist "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" set "MONGOD_EXE=C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
if "%MONGOD_EXE%"=="" if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" set "MONGOD_EXE=C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
if "%MONGOD_EXE%"=="" if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" set "MONGOD_EXE=C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"

if "%MONGOD_EXE%"=="" (
  echo [ERROR] mongod.exe not found in standard install paths.
  echo Install MongoDB Community Server or edit this script with your mongod path.
  exit /b 1
)

if not exist "%DBPATH%" mkdir "%DBPATH%"
if not exist "%ROOT%backend\.local\mongodb" mkdir "%ROOT%backend\.local\mongodb"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":27017 .*LISTENING"') do (
  echo [INFO] Port 27017 is already in use by PID %%a.
  echo [INFO] Skipping mongod start.
  exit /b 0
)

echo [INFO] Starting MongoDB...
echo [INFO] DB Path: %DBPATH%
echo [INFO] Log Path: %LOGPATH%
start "SwachhaNet-Local-MongoDB" "%MONGOD_EXE%" --dbpath "%DBPATH%" --bind_ip 127.0.0.1 --port 27017 --logpath "%LOGPATH%" --logappend

ping 127.0.0.1 -n 4 >nul

for /f "tokens=5" %%a in ('netstat -ano ^| findstr /R /C:":27017 .*LISTENING"') do (
  echo [OK] MongoDB is listening on 127.0.0.1:27017 (PID %%a).
  exit /b 0
)

echo [WARN] MongoDB process was started, but port 27017 is not reachable yet.
echo [WARN] Check logs at: %LOGPATH%
exit /b 1
