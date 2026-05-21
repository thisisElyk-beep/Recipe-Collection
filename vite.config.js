import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set base to '/<your-repo-name>/' if deploying as a project page
// e.g. base: '/recipe-vault/'
export default defineConfig({
  plugins: [react()],
  base: 'Recipe-Collection/',
})
