const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const bindRoutes = require('@core/util/functions/bind_routes');
const config = require('@core/util/functions/config');
const routes = require('@src/routes');
const AppErrorModule = require('@src/utils/classes/AppError');

const AppError = AppErrorModule.default || AppErrorModule.AppError || AppErrorModule;

function createApp() {
  const app = express();
  const corsOrigins = config('server.corsOrigins', [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8080',
    'http://localhost:8081'
  ]);

  app.use(cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    credentials: true
  }));
  app.use(cookieParser());
  app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use('/api/v1/webhooks/paypal', express.raw({ type: 'application/json' }));
  app.use('/api/v1/webhooks/paystack', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '1mb' }));

  bindRoutes(app, routes, {
    controllers_base_dir: path.resolve(__dirname, 'controllers'),
    middlewares_base_dir: path.resolve(__dirname, 'middlewares')
  });

  app.use((req, _res, next) => {
    next(new AppError({
      statusCode: 404,
      publicMessage: 'Route not found.',
      internalMessage: `Route not found: ${req.method} ${req.originalUrl}`,
      errorCode: 'ROUTE_NOT_FOUND'
    }));
  });

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;
    const publicMessage = error.publicMessage || error.message || 'Internal server error.';

    res.status(statusCode).json({
      success: false,
      message: publicMessage,
      errorCode: error.errorCode || 'INTERNAL_ERROR',
      metadata: error.metadata || {}
    });
  });

  return app;
}

module.exports = createApp;
module.exports.createApp = createApp;
