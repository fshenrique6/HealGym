@echo off
cd /d "%~dp0"
title HealGym Backend

set "JAVA_HOME=%USERPROFILE%\.local\jdk-17"
set "MVN=%USERPROFILE%\.local\apache-maven-3.9.11\bin\mvn.cmd"

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo Nao encontrei o Java em %JAVA_HOME%
  pause
  exit /b 1
)

if not exist "%MVN%" (
  echo Nao encontrei o Maven em %MVN%
  pause
  exit /b 1
)

echo Encerrando o que estiver na porta 5000...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5000 .*LISTENING"') do (
  if not "%%P"=="0" (
    echo Encerrando processo %%P
    taskkill /PID %%P /F >nul 2>&1
  )
)

echo Iniciando o MongoDB...
docker start healgym-mongodb
if errorlevel 1 (
  echo.
  echo Nao consegui iniciar o MongoDB. Abra o Docker Desktop e tente de novo.
  pause
  exit /b 1
)

echo Aguardando o MongoDB responder...
set /a TRIES=0
:waitmongo
set /a TRIES+=1
docker exec healgym-mongodb mongosh --quiet --eval "db.runCommand({ ping: 1 })" >nul 2>&1
if not errorlevel 1 goto mongo_ok
if %TRIES% geq 30 (
  echo O MongoDB nao respondeu.
  pause
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto waitmongo

:mongo_ok
echo.
echo Iniciando o backend na porta 5000...
"%MVN%" spring-boot:run
echo.
echo O backend parou.
pause
