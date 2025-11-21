import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Fix: Use '.' instead of process.cwd() to avoid TS error about cwd missing on Process type
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // This allows process.env.API_KEY to work in the browser code
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});