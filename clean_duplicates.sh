#!/bin/bash

# Lista de arquivos para processar
FILES=$(grep -l "import { BottomNavigation }" client/src/pages/*.tsx)

for file in $FILES; do
  echo "Processando $file..."
  
  # Remove a linha de importação
  sed -i '/import { BottomNavigation } from/d' "$file"
  
  # Remove a linha com o componente
  sed -i '/<BottomNavigation \/>/d' "$file"
done

echo "Concluído! Todos os duplicados foram removidos."
