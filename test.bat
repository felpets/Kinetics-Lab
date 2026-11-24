@echo off
echo ==================================================
echo Executando Bateria de Testes Cientificos
echo ==================================================
call node test_suite.js
if errorlevel 1 (
    echo [ERRO] Falha nos testes de validacao.
    exit /b 1
)
pause
