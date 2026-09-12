import app from './app.js';
import { ENV } from './config/env.js';
import { whatsappService } from './services/whatsapp.service.js';

import { adminService } from './services/admin.service.js';

const server = app.listen(ENV.PORT, ENV.HOST, async () => {
  console.log('\n======================================================');
  console.log('🚀 WhatsApp REST API Gateway is running!');
  console.log(`📡 URL: http://${ENV.HOST === '0.0.0.0' ? 'localhost' : ENV.HOST}:${ENV.PORT}`);
  console.log(`⚙️  Environment: ${ENV.NODE_ENV}`);
  console.log(`🤖 Engine: ${ENV.WHATSAPP_ENGINE.toUpperCase()}`);
  if (ENV.WHATSAPP_ENGINE === 'baileys') {
    console.log(`💾 Session Storage: ${ENV.SESSION_DATA_PATH}`);
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

function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
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
