import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000';
const internalGatewayToken = process.env.INTERNAL_GATEWAY_TOKEN;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (internalGatewayToken) {
              proxyReq.setHeader('X-Internal-Gateway', internalGatewayToken);
            }
          });
        },
      },
    },
  },
});
