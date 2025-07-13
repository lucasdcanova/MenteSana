// build-web.js
// Script para realizar o build do projeto e gerar os arquivos estáticos em uma pasta www

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Garantir que a pasta www existe
if (!fs.existsSync('www')) {
  fs.mkdirSync('www', { recursive: true });
  console.log('Pasta www/ criada com sucesso.');
}

// Executar o comando de build do Vite com configuração específica para web
console.log('Iniciando o build do frontend...');
exec('npx vite build --config vite.config.web.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`Erro ao executar o build: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`Erro no build: ${stderr}`);
    return;
  }
  
  console.log(`Build concluído com sucesso!`);
  console.log(stdout);
  
  console.log('Arquivos estáticos gerados na pasta www/');
  
  // Listar os arquivos gerados
  const listFiles = (dir, prefix = '') => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.log(`${prefix}${file}/`);
        listFiles(filePath, prefix + '  ');
      } else {
        console.log(`${prefix}${file} (${(stats.size / 1024).toFixed(2)} KB)`);
      }
    });
  };
  
  listFiles('www');
});