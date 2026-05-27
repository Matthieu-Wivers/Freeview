import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET ||
    process.env.VITE_API_PROXY_TARGET ||
    'http://localhost:3000';

  const internalGatewayToken =
    env.INTERNAL_GATEWAY_TOKEN ||
    process.env.INTERNAL_GATEWAY_TOKEN;

  console.log(`[vite] API proxy target: ${apiProxyTarget}`);

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (internalGatewayToken) {
                proxyReq.setHeader('X-Internal-Gateway', internalGatewayToken);
              }
            });

            proxy.on('error', (err, req) => {
              console.error(
                '[vite proxy error]',
                req?.method,
                req?.url,
                err?.code || err?.message,
              );
            });
          },
        },
      },
    },
  };
});