import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function assistantAssetFallback(): Plugin {
    const assets = new Map([
        ['/assistant.gif', ['assets/images/assistant.gif', 'image/gif']],
        ['/assets/images/assistant.gif', ['assets/images/assistant.gif', 'image/gif']],
        ['/assistant.png', ['assets/images/assistant.png', 'image/png']],
        ['/assets/images/assistant.png', ['assets/images/assistant.png', 'image/png']],
    ]);

    return {
        name: 'assistant-asset-fallback',
        configureServer(server) {
            server.middlewares.use((request, response, next) => {
                const pathname = request.url?.split('?')[0] ?? '';
                const asset = assets.get(pathname);

                if (!asset) {
                    next();
                    return;
                }

                const [relativePath, contentType] = asset;
                const filePath = resolve(__dirname, 'public', relativePath);
                const stat = statSync(filePath);

                response.statusCode = 200;
                response.setHeader('Content-Type', contentType);
                response.setHeader('Content-Length', stat.size);

                if (request.method === 'HEAD') {
                    response.end();
                    return;
                }

                createReadStream(filePath).pipe(response);
            });
        },
    };
}

function reactRoot(): Plugin {
    return {
        name: 'react-root',
        configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
                if (request.url !== '/') {
                    next();
                    return;
                }

                const html = readFileSync(resolve(__dirname, 'index.html'), 'utf-8');
                const transformedHtml = await server.transformIndexHtml('/', html);

                response.statusCode = 200;
                response.setHeader('Content-Type', 'text/html');
                response.end(transformedHtml);
            });
        },
    };
}

export default defineConfig({
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
    },
    plugins: [
        assistantAssetFallback(),
        reactRoot(),
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
});
