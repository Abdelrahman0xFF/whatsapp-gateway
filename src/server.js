import app from './app.js';
import { ENV } from './config/env.js';
import { databaseService } from './config/database.js';
import { whatsappService } from './services/whatsapp.service.js';
import { adminService } from './services/admin.service.js';
import { tokenService } from './services/token.service.js';
import { activityService } from './services/activity.service.js';
import { webhookService } from './services/webhook.service.js';

// Connect to MongoDB if MONGODB_URI is provided, or fall back to local file storage
try {
  await databaseService.connect();
  await adminService.init();
  await tokenService.init();
  await activityService.init();
  await webhookService.init();
} catch (err) {
  console.error('Error during initial storage setup:', err.message);
}

const server = app.listen(ENV.PORT, ENV.HOST, async () => {
  console.log('\n======================================================');
  console.log('🚀 WhatsApp REST API Gateway is running!');
  console.log(`📡 URL: http://${ENV.HOST === '0.0.0.0' ? 'localhost' : ENV.HOST}:${ENV.PORT}`);
  console.log(`⚙️  Environment: ${ENV.NODE_ENV}`);
  console.log(`🤖 Engine: ${ENV.WHATSAPP_ENGINE.toUpperCase()}`);
  if (databaseService.isConnected()) {
    console.log(`🍃 Storage Mode: MongoDB (Database: "${databaseService.getDb().databaseName}")`);
  } else {
    console.log(`📁 Storage Mode: Local JSON Files (${ENV.SESSION_DATA_PATH})`);
  }
  if (ENV.WHATSAPP_ENGINE === 'baileys') {
    console.log(`💾 Session Storage: ${databaseService.isConnected() ? 'MongoDB ("baileys_auth" collection)' : ENV.SESSION_DATA_PATH}`);
  } else {
    console.log(`🔗 Remote Evolution API: ${ENV.EVOLUTION_API_URL}`);
  }
  adminService.printStartupBanner();
  console.log('======================================================\n');

  try {
    await whatsappService.init();
  } catch (err) {
    console.error('Failed to initialize WhatsApp engine:', err);
  }
});

async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  try {
    tokenService.flushSync();
  } catch (err) {
    console.error('Error flushing token store:', err.message);
  }

  try {
    activityService.flushSync();
  } catch (err) {
    console.error('Error flushing activity store:', err.message);
  }

  try {
    await whatsappService.destroy();
  } catch (err) {
    console.error('Error disconnecting WhatsApp engine:', err.message);
  }

  try {
    await databaseService.disconnect();
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err.message);
  }

  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 [Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 [Process] Uncaught Exception:', err);
});
