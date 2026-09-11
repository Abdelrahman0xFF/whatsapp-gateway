import { whatsappService } from '../services/whatsapp.service.js';

class InstanceController {
  async getStatus(req, res, next) {
    try {
      const status = await whatsappService.checkConnection();
      return res.status(200).json({
        success: true,
        ...status
      });
    } catch (error) {
      next(error);
    }
  }

  async getQr(req, res, next) {
    try {
      const qrData = await whatsappService.getQrCode();
      return res.status(200).json(qrData);
    } catch (error) {
      next(error);
    }
  }

  async getPairingCode(req, res, next) {
    try {
      const { number, phone } = req.body || {};
      const targetNumber = number || phone;
      if (!targetNumber) {
        return res.status(400).json({
          success: false,
          error: 'Please provide "number" (your phone number with country code, e.g. 201012345678).'
        });
      }
      const result = await whatsappService.requestPairingCode(targetNumber);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async connect(req, res, next) {
    try {
      const result = await whatsappService.connectInstance();
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const result = await whatsappService.logoutInstance();
      return res.status(200).json({
        success: true,
        message: 'Instance logged out successfully.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async restart(req, res, next) {
    try {
      const result = await whatsappService.restartInstance();
      return res.status(200).json({
        success: true,
        message: 'Instance restart triggered.',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const instanceController = new InstanceController();
