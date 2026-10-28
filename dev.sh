#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias necessarias..."
    npm install
fi

echo "Iniciando o servidor Vite e abrindo no navegador..."
npx vite --open

