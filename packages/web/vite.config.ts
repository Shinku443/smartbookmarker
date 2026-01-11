import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@smart/core": path.resolve(__dirname, "../core")
    }
  },
  optimizeDeps: {
    include: ['pouchdb', 'pouchdb-replication', 'pouchdb-adapter-idb']
  },
  build: {
    rollupOptions: {
      external: ['pouchdb', 'pouchdb-replication']
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/sync': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
