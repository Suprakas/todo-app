import 'dotenv/config';

const parseList = (value) =>
  (value || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  // Comma-separated allowed origins, e.g. "https://my-todo.netlify.app". Empty = allow all.
  corsOrigins: parseList(process.env.CORS_ORIGIN),
  // Optional, e.g. "8.8.8.8,1.1.1.1" — for networks whose DNS refuses SRV lookups
  dnsServers: parseList(process.env.DNS_SERVERS),
};