import { ENV } from '../config/env.js';
import { baileysService } from './baileys.service.js';
import { evolutionService } from './evolution.service.js';

class WhatsAppService {
  constructor() {
    this.engineName = ENV.WHATSAPP_ENGINE;
    this.activeService = this.engineName === 'evolution' ? evolutionService : baileysService;
  }

  async init() {
    if (this.engineName === 'baileys') {
      console.log('🤖 Initializing embedded Baileys WhatsApp engine...');
      await baileysService.init();
    } else {
      console.log(`📡 Using remote Evolution API engine at: ${ENV.EVOLUTION_API_URL}`);
    }
  }

  checkConnection() {
    return this.activeService.checkConnection();
  }

  getQrCode() {
    return this.activeService.getQrCode();
  }

  requestPairingCode(phoneNumber) {
    if (this.activeService.requestPairingCode) {
      return this.activeService.requestPairingCode(phoneNumber);
    }
    throw new Error('Pairing code feature is available in embedded Baileys engine mode.');
  }

  connectInstance() {
    return this.activeService.connectInstance ? this.activeService.connectInstance() : this.activeService.getQrCode();
  }

  sendTextMessage(number, text) {
    return this.activeService.sendTextMessage(number, text);
  }

  logoutInstance() {
    return this.activeService.logoutInstance();
  }

  restartInstance() {
    return this.activeService.restartInstance ? this.activeService.restartInstance() : this.activeService.logoutInstance();
  }
}

export const whatsappService = new WhatsAppService();
