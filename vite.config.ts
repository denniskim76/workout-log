/// <reference types="vitest/config" />
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    setupFiles: ['fake-indexeddb/auto'],
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
