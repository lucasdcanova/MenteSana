#!/bin/bash

# Criar diretório para PDFs se não existir
mkdir -p docs/pdf

# Converter arquivos Markdown para HTML com estilo
echo "Convertendo Propósito MindWell para HTML..."
pandoc docs/proposito_mindwell.md -o docs/pdf/proposito_mindwell.html --standalone --css=../style.css --metadata title="Propósito e Visão MindWell"

echo "Convertendo Manual do Usuário para HTML..."
pandoc docs/manual_do_usuario_mindwell.md -o docs/pdf/manual_do_usuario_mindwell.html --standalone --css=../style.css --metadata title="Manual do Usuário MindWell"

echo "Convertendo Termos de Uso para HTML..."
pandoc docs/termos_de_uso_mindwell.md -o docs/pdf/termos_de_uso_mindwell.html --standalone --css=../style.css --metadata title="Termos e Condições de Uso MindWell"

echo "Convertendo Política de Privacidade para HTML..."
pandoc docs/politica_de_privacidade_mindwell.md -o docs/pdf/politica_de_privacidade_mindwell.html --standalone --css=../style.css --metadata title="Política de Privacidade MindWell"

echo "Convertendo Arquitetura Técnica para HTML..."
pandoc docs/arquitetura_tecnica_mindwell.md -o docs/pdf/arquitetura_tecnica_mindwell.html --standalone --css=../style.css --metadata title="Documentação Técnica MindWell"

echo "Convertendo Guia de Implementação para HTML..."
pandoc docs/guia_implementacao_mindwell.md -o docs/pdf/guia_implementacao_mindwell.html --standalone --css=../style.css --metadata title="Guia de Implementação MindWell"

echo "Conversão concluída! Os HTMLs estão disponíveis no diretório docs/pdf/"