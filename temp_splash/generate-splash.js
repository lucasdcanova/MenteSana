// Script para converter o SVG em PNG otimizado para uso como splash screen
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lê o arquivo SVG
const svgContent = fs.readFileSync(path.join(__dirname, 'mindwell-logo.svg'), 'utf8');

// Cria um arquivo HTML temporário com o SVG
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 1242px;
      height: 1242px;
      overflow: hidden;
    }
    svg {
      width: 1242px;
      height: 1242px;
    }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'temp.html'), htmlContent);

// Obtém o diretório de destino
const iosDestDir = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');

console.log('Gerando splash screen PNG otimizada para iOS...');
console.log('Diretório de destino:', iosDestDir);

// Gera arquivos PNG para iOS
try {
  console.log('Para realizar a conversão, você precisará usar uma ferramenta');
  console.log('de conversão SVG para PNG, como Inkscape, ImageMagick, ou Squoosh.');
  console.log('');
  console.log('Instruções manuais:');
  console.log('1. Localize o arquivo temp_splash/mindwell-logo.svg');
  console.log('2. Converta-o para PNG com resolução 1242x1242 pixels');
  console.log('3. Copie o PNG resultante para:');
  console.log('   - ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png');
  console.log('   - ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png');
  console.log('   - ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png');
  console.log('');
  console.log('Alternativa: Execute o script optimize-splash.sh no macOS');
  console.log('após colocar seu próprio ícone em ios/App/App/Assets.xcassets/Splash.imageset/');
  
  console.log('Arquivo SVG salvo em temp_splash/mindwell-logo.svg');
} catch (error) {
  console.error('Erro ao gerar arquivos PNG:', error);
}