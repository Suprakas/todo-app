import 'dotenv/config';

const parseOrigins = (value) =>
  (value || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  // Comma-separated list of allowed origins, e.g. "https://my-todo.netlify.app,http://localhost:5173".
  // Empty means "allow all" (handy for local dev).
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),
};
