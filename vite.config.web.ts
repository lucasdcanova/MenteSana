import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";

// Configuração específica para build web que gera arquivos na pasta www
export default defineConfig({
  plugins: [
    react(),
    themePlugin(),
    // Removidos os plugins específicos do Replit para build de produção
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "www"),
    emptyOutDir: true,
    // Otimizações para produção
    minify: true,
    cssMinify: true,
    sourcemap: false, // Desabilitar sourcemaps em produção
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          tanstack: ['@tanstack/react-query'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'cmdk',
            'lucide-react'
          ],
        }
      }
    }
  },
});