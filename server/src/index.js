import dns from 'node:dns';
import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
import { mongoTaskRepository } from './repositories/mongoTaskRepository.js';
import { createMemoryTaskRepository } from './repositories/memoryTaskRepository.js';

async function start() {
  let repo;

  if (config.dnsServers.length) {
    dns.setServers(config.dnsServers);
    console.log('• Using DNS servers:', config.dnsServers.join(', '));
  }

  if (config.mongoUri) {
    await mongoose.connect(config.mongoUri);
    console.log('✓ Connected to MongoDB');
    repo = mongoTaskRepository;
  } else if (config.env === 'production') {
    throw new Error('MONGODB_URI is required in production');
  } else {
    console.warn('⚠ MONGODB_URI not set — using in-memory storage (data resets on restart)');
    repo = createMemoryTaskRepository();
  }

  const app = createApp({ repo, corsOrigins: config.corsOrigins });
  const server = app.listen(config.port, () => {
    console.log(`✓ API listening on http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});