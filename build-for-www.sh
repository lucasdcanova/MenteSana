#!/bin/bash

# Script para compilar a aplicação e mover para a pasta www

echo "Iniciando build para a pasta www..."

# Garantir que a pasta www existe
mkdir -p www

# Executar o build do vite diretamente para a pasta www
echo "Executando vite build com configuração web..."
npx vite build --config vite.config.web.ts

# Verificar se o build foi bem-sucedido
if [ $? -ne 0 ]; then
  echo "Erro ao executar o build. Abortando."
  exit 1
fi

# Verificar se a cópia foi bem-sucedida
if [ $? -ne 0 ]; then
  echo "Erro ao copiar arquivos para a pasta www. Abortando."
  exit 1
fi

echo "Build para www concluído com sucesso!"
echo "Os arquivos estáticos estão disponíveis na pasta www/"

# Listar os arquivos gerados
echo "Arquivos gerados:"
ls -la www/

echo "Build web concluído!"