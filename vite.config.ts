import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import { SITE_BASE } from './src/config.ts';

// GitHub Pages 以项目子路径 https://zhubao315.github.io/uRead/ 部署，
// 因此 base 必须与仓库名一致，否则静态资源与深层路由都会 404。
// base 与路由 basename 同源于 src/config.ts，避免两处手写产生漂移。
export default defineConfig(({ mode }) => ({
  base: SITE_BASE,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) 要求 manualChunks 为函数形式
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
}));
