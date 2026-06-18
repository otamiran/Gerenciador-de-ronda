import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Garante que assets estáticos (sw.js, manifest.json, ícones) sejam servidos
  publicDir: 'public',
  build: {
    // Gera source maps para facilitar debug em produção
    sourcemap: false,
    rollupOptions: {
      output: {
        // Divide o bundle para carregamento mais rápido em mobile
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
