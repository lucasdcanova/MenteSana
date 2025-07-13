#!/bin/bash

echo "Iniciando MindWell com Expo Go..."
echo "====================================="

# Diretório temporário para o Expo
cd expo-app

# Criar node_modules se não existir
mkdir -p node_modules

# Usando Expo diretamente via npx sem instalar localmente
echo "Iniciando Expo via npx..."
echo "QR Code de conexão será exibido em instantes..."

# Executar o expo com uma flag para ignorar verificações de dependência
npx expo start --no-dev --no-minify