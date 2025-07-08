import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Linha atualizada com o nome do seu repositório
  base: '/GEMBA-APP/' 
})