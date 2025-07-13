#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores para o console
const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

console.log(`${colors.blue}${colors.bold}
╔═══════════════════════════════════════════════════╗
║                                                   ║
║         MindWell - Inicializador Expo Go          ║
║                                                   ║
╚═══════════════════════════════════════════════════╝${colors.reset}
`);

const expoAppDir = path.join(__dirname, 'expo-app');

// Verificar se o diretório expo-app existe
if (!fs.existsSync(expoAppDir)) {
  console.error(`${colors.red}Erro: Diretório 'expo-app' não encontrado!${colors.reset}`);
  process.exit(1);
}

// Entrar no diretório expo-app
process.chdir(expoAppDir);
console.log(`${colors.green}Navegando para o diretório ${colors.bold}expo-app${colors.reset}`);

// Criar node_modules se não existir
if (!fs.existsSync('node_modules')) {
  fs.mkdirSync('node_modules', { recursive: true });
  console.log(`${colors.green}Diretório node_modules criado${colors.reset}`);
}

// Preparando para iniciar o Expo
console.log(`${colors.yellow}Iniciando Expo Go...${colors.reset}`);
console.log(`${colors.yellow}Aguarde o QR code aparecer no terminal${colors.reset}`);
console.log('');

try {
  // Executar o comando npx expo
  execSync('npx expo start --no-dev --no-minify', { stdio: 'inherit' });
} catch (error) {
  console.error(`${colors.red}Erro ao iniciar o Expo:${colors.reset}`, error.message);
  process.exit(1);
}