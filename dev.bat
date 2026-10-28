@echo off
title Kinetics Lab - Servidor Web
cd /d "%~dp0"

echo ===================================================
echo             Iniciando o Kinetics Lab               
echo ===================================================
echo.

if not exist node_modules (
    echo Instalando dependencias necessarias...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

echo Iniciando o servidor Vite e abrindo no navegador...
echo Pressione Ctrl+C para encerrar.
echo.

call npx vite --open
pause

