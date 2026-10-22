import { defineConfig } from 'vitest/config';
export default defineConfig({server:{allowedHosts:['terminal.local']},base:process.env.VITE_BASE_PATH || './',build:{target:'es2022',chunkSizeWarningLimit:600},test:{environment:'node',include:['tests/**/*.test.{ts,tsx}'],testTimeout:20000}});
