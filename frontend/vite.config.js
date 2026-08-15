import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  envPrefix: ["VITE_", "SUPABASE_", "REACT_APP_"],
  plugins: [
    tailwindcss(),
  ],
})