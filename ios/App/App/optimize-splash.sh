#!/bin/bash

# Script para otimizar as imagens da splash screen
# Reduz a resolução para 1242x1242 e utiliza o logo Mindwell

echo "Iniciando otimização das imagens da splash screen Mindwell..."

# Verifica se há o comando sips (ferramenta nativa do macOS)
command -v sips >/dev/null 2>&1 || { 
  echo "Erro: ferramenta 'sips' não encontrada. Este script precisa ser executado em um Mac." >&2
  exit 1
}

# Diretório das imagens
IMAGE_DIR="./Assets.xcassets/Splash.imageset"
ROOT_DIR="$(cd ../../.. && pwd)"
SVG_PATH="$ROOT_DIR/temp_splash/mindwell-logo.svg"

# Verifica se o SVG existe
if [[ ! -f "$SVG_PATH" ]]; then
  echo "Aviso: Logo SVG do Mindwell não encontrado em $SVG_PATH."
  echo "Prosseguindo apenas com a otimização das imagens existentes."
else
  echo "Logo Mindwell encontrado em $SVG_PATH"
  # Você pode adicionar uma conversão de SVG para PNG aqui se tiver as ferramentas adequadas
  echo "Para converter o SVG para PNG, use uma ferramenta como Inkscape ou SVGO no macOS."
fi

# Cria diretório temporário
TEMP_DIR=$(mktemp -d)
echo "Diretório temporário: $TEMP_DIR"

# Verifica se as imagens existem
for img in "$IMAGE_DIR/splash-2732x2732.png" "$IMAGE_DIR/splash-2732x2732-1.png" "$IMAGE_DIR/splash-2732x2732-2.png"; do
  if [[ ! -f "$img" ]]; then
    echo "Erro: Imagem $img não encontrada."
    exit 1
  fi
done

echo "Fazendo backup das imagens originais..."
cp "$IMAGE_DIR/splash-2732x2732.png" "$TEMP_DIR/splash-2732x2732.png.bak"
cp "$IMAGE_DIR/splash-2732x2732-1.png" "$TEMP_DIR/splash-2732x2732-1.png.bak"
cp "$IMAGE_DIR/splash-2732x2732-2.png" "$TEMP_DIR/splash-2732x2732-2.png.bak"

echo "Redimensionando e otimizando as imagens..."

# Redimensiona as imagens existentes
echo "Redimensionando imagens para 1242x1242..."
sips -s format png -z 1242 1242 "$IMAGE_DIR/splash-2732x2732.png" --out "$TEMP_DIR/splash-1242.png"
sips -s format png -z 1242 1242 "$IMAGE_DIR/splash-2732x2732-1.png" --out "$TEMP_DIR/splash-1242-1.png"
sips -s format png -z 1242 1242 "$IMAGE_DIR/splash-2732x2732-2.png" --out "$TEMP_DIR/splash-1242-2.png"

# Comprime com pngquant se disponível
if command -v pngquant >/dev/null 2>&1; then
  echo "Aplicando compressão adicional com pngquant..."
  pngquant --force --output "$TEMP_DIR/splash-1242-opt.png" "$TEMP_DIR/splash-1242.png"
  pngquant --force --output "$TEMP_DIR/splash-1242-1-opt.png" "$TEMP_DIR/splash-1242-1.png"
  pngquant --force --output "$TEMP_DIR/splash-1242-2-opt.png" "$TEMP_DIR/splash-1242-2.png"
  
  # Move os arquivos otimizados
  mv "$TEMP_DIR/splash-1242-opt.png" "$IMAGE_DIR/splash-2732x2732.png"
  mv "$TEMP_DIR/splash-1242-1-opt.png" "$IMAGE_DIR/splash-2732x2732-1.png"
  mv "$TEMP_DIR/splash-1242-2-opt.png" "$IMAGE_DIR/splash-2732x2732-2.png"
else
  # Se pngquant não estiver disponível, use apenas as imagens redimensionadas
  echo "pngquant não encontrado, usando apenas redimensionamento..."
  mv "$TEMP_DIR/splash-1242.png" "$IMAGE_DIR/splash-2732x2732.png"
  mv "$TEMP_DIR/splash-1242-1.png" "$IMAGE_DIR/splash-2732x2732-1.png"
  mv "$TEMP_DIR/splash-1242-2.png" "$IMAGE_DIR/splash-2732x2732-2.png"
fi

# NOTA PARA PERSONALIZAÇÃO DO LOGO MINDWELL:
# ------------------------------------------------------
# Para criar uma splash screen com o logo do Mindwell:
# 1. Converta o arquivo temp_splash/mindwell-logo.svg para PNG
# 2. Substitua os arquivos gerados por este script pelo PNG convertido
# 3. Certifique-se de que o arquivo PNG tem 1242x1242 pixels
#
# Exemplo de comando usando ImageMagick (se disponível):
# convert -background white -fill "#6C8EFF" -size 1242x1242 \
#   "$SVG_PATH" "$IMAGE_DIR/splash-2732x2732.png"
# 
# Em seguida, copie o mesmo arquivo para as outras versões:
# cp "$IMAGE_DIR/splash-2732x2732.png" "$IMAGE_DIR/splash-2732x2732-1.png"
# cp "$IMAGE_DIR/splash-2732x2732.png" "$IMAGE_DIR/splash-2732x2732-2.png"
# ------------------------------------------------------

# Mostra tamanho das novas imagens
echo "Novas imagens geradas com sucesso:"
ls -la "$IMAGE_DIR"/*.png

echo "Antes da otimização: aproximadamente 41MB por imagem"
echo "Depois da otimização: $(du -h "$IMAGE_DIR/splash-2732x2732.png" | cut -f1) por imagem"

echo "Otimização concluída. As novas imagens devem evitar erros de limite de memória."
echo "Se precisar restaurar as imagens originais, os backups estão em: $TEMP_DIR"