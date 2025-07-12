import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

// import { defineConfig, loadEnv } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig(({ mode }) => {
//   const env = loadEnv(mode, process.cwd(), '');
//   const API_BASE_URL = env.VITE_API_BASE_URL;
//   return {
//     plugins: [react()],
//     server: {
//       proxy: {
//         '/': {
//           target: API_BASE_URL,
//           changeOrigin: true,
//         },
//       },
//     },
//   };
// });
