/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'lucide-vendor': ['lucide-react']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    typecheck: {
      tsconfig: './tsconfig.test.json'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
        '**/index.ts',
        'electron/main.js',
        'electron/preload.js',
        'scripts/',
        'tampermonkey/',
        'docs_perso/',
        '**/*.test.{js,ts,tsx}',
        '**/*.spec.{js,ts,tsx}'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },
      include: [
        'src/**/*.{ts,tsx}',
        'electron/**/*.js'
      ]
    },
    include: ['tests/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git']
  }
});
