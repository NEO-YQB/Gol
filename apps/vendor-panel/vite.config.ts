import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@frontend-core': resolve(__dirname, '../../packages/frontend-core/src'),
      react: resolve(__dirname, '../../node_modules/react'),
      'react/jsx-runtime': resolve(
        __dirname,
        '../../node_modules/react/jsx-runtime.js',
      ),
      'react/jsx-dev-runtime': resolve(
        __dirname,
        '../../node_modules/react/jsx-dev-runtime.js',
      ),
      'react-dom': resolve(__dirname, '../../node_modules/react-dom'),
    },
  },
  server: {
    port: 5174,
  },
})
