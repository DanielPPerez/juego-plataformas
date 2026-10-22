import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas para que el build funcione dentro del iframe de itch.io
  base: './',
  build: {
    assetsInlineLimit: 0,
  },
});
