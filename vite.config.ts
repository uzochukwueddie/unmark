import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const ortDir = join(root, 'public', 'ort');

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cross-origin-isolation',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
          next();
        });
      },
    },
    {
      name: 'ort-mjs-passthrough',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = (req.url ?? '').split('?')[0].split('#')[0];
          const match = url.match(/^\/ort\/([\w.-]+\.mjs)$/);
          if (!match) {
            next();
            return;
          }
          try {
            const content = await readFile(join(ortDir, match[1]));
            res.setHeader('Content-Type', 'text/javascript');
            res.end(content);
          } catch {
            next();
          }
        });
      },
    },
  ],
  server: {
    port: 3000,
    allowedHosts: ['0c3b-128-0-153-253.ngrok-free.app'],
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
});
