import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import morgan from 'morgan';

import categoryRouter from './router/category.router.js';
import wilayaRouter from './router/wilaya.router.js';
import communeRouter from './router/commune.router.js';
import productRouter from './router/product.router.js';
import couponRouter from './router/coupon.router.js';
import orderRouter from './router/order.router.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/categories', categoryRouter);
app.use('/api/wilayas', wilayaRouter);
app.use('/api/communes', communeRouter);
app.use('/api/products', productRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/orders', orderRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  console.error(error);
  const status = typeof error === 'object' && error !== null && 'status' in error
    && typeof error.status === 'number' && Number.isInteger(error.status)
    && error.status >= 400 && error.status < 500
    ? error.status
    : 500;

  res.status(status).json({
    message: status === 500 ? 'Internal server error' : 'Invalid request',
  });
};

app.use(errorHandler);

export default app;
