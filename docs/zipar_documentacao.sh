#!/bin/bash

# Criar uma cópia da pasta de estilo no diretório pdf
cp docs/style.css docs/pdf/

# Criar arquivo zip com toda a documentação
echo "Criando arquivo ZIP com a documentação..."
cd docs
zip -r documentacao_mindwell.zip pdf/

echo "Documentação completa disponível em docs/documentacao_mindwell.zip"