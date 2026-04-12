// import react from '@vitejs/plugin-react'
// import { defineConfig } from 'vite'
// import { nodePolyfills } from 'vite-plugin-node-polyfills'

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [
//     react(),
//     nodePolyfills({
//       globals: {
//         Buffer: true,
//       },
//     }),
//   ],
//   server: {
//     watch: {
//       usePolling: true,
//     },
//     host: true,
//   },
// })


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
    }),
  ],
  server: {
    watch: {
      usePolling: true, // 🔥 THIS FIXES WSL NOT DETECTING FILE CHANGES
    },
    host: true,
  },
})