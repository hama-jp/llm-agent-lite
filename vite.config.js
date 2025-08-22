import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { fsApi } from './server/fs-api.js'
import express from 'express'

const apiMiddleware = () => {
  const app = express()
  fsApi(app)
  return {
    name: 'fs-api-middleware',
    configureServer(server) {
      server.middlewares.use(app)
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 相対パスに変更
  plugins: [react(), tailwindcss(), apiMiddleware()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})

