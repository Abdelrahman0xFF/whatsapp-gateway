import { ENV } from '../config/env.js';

class EvolutionService {
  constructor() {
    this.baseUrl = ENV.EVOLUTION_API_URL;
    this.apiKey = ENV.EVOLUTION_API_KEY;
    this.instanceName = ENV.INSTANCE_NAME;
  }

  _buildUrl(endpoint) {
    return `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
  }

  async _request(endpoint, options = {}) {
    const url = this._buildUrl(endpoint);
    const headers = {
      'apikey': this.apiKey,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const timeoutMs = options.timeout || 15000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = 
          data?.message || 
          data?.response?.message || 
          data?.error || 
          `Evolution API error: ${response.statusText} (${response.status})`;
        
        const error = new Error(Array.isArray(message) ? message.join(', ') : message);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Evolution API request timed out after ${timeoutMs}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async checkConnection() {
    try {
      const data = await this._request(`instance/connectionState/${this.instanceName}`, {
        method: 'GET',
        timeout: 6000
      });

      const state = data?.instance?.state || data?.state || 'disconnected';
      const connected = state === 'open';

      return {
        instance: this.instanceName,
        state,
        connected,
        raw: data
      };
    } catch (error) {
      return {
        instance: this.instanceName,
        state: 'disconnected',
        connected: false,
        error: error.message
      };
    }
  }

  async getQrCode() {
    try {
      const data = await this._request(`instance/connect/${this.instanceName}`, {
        method: 'GET',
        timeout: 8000
      });

      let qr = data?.base64 || data?.code || null;
      if (qr && !qr.startsWith('data:image')) {
        qr = `data:image/png;base64,${qr}`;
      }

      return {
        success: true,
        instance: this.instanceName,
        qr,
        code: data?.code || null,
        pairingCode: data?.pairingCode || null,
        count: data?.count || 0
      };
    } catch (error) {
      throw new Error(`Failed to retrieve QR code: ${error.message}`);
    }
  }

  async connectInstance() {
    return this.getQrCode();
  }

  async sendTextMessage(number, text) {
    if (!number || !text) {
      throw new Error('Both "number" and "message" are required to send a WhatsApp message.');
    }

    const cleanNumber = number.toString().replace(/\D/g, '');
    if (cleanNumber.length < 7 || cleanNumber.length > 15) {
      throw new Error(`Invalid phone number "${number}".`);
    }

    const status = await this.checkConnection();
    if (!status.connected) {
      throw new Error(`WhatsApp instance "${this.instanceName}" is not connected.`);
    }

    const payload = {
      number: cleanNumber,
      text: text.trim()
    };

    const response = await this._request(`message/sendText/${this.instanceName}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      timeout: 15000
    });

    return {
      success: true,
      recipient: cleanNumber,
      messageId: response?.key?.id || response?.messageId || null,
      status: response?.status || 'PENDING',
      response
    };
  }

  async logoutInstance() {
    return this._request(`instance/logout/${this.instanceName}`, {
      method: 'DELETE',
      timeout: 8000
    });
  }

  async restartInstance() {
    return this._request(`instance/restart/${this.instanceName}`, {
      method: 'POST',
      timeout: 10000
    });
  }
}

export const evolutionService = new EvolutionService();
