import app from './app.js';

const port = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});

const shutdown = () => {
  console.log('Shutting down...');
  server.close(async () => {
    // await redis.quit();   // uncomment, using your redis client
    process.exit(0);
  });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);