import { otpService } from '../services/otp.service.js';

class OtpController {
  async requestOtp(req, res, next) {
    try {
      const { number, appName, length, expiresInMinutes } = req.validated;
      const result = await otpService.requestOtp(number, appName, length, expiresInMinutes);

      return res.status(200).json({
        success: true,
        message: 'OTP code generated and dispatched via WhatsApp.',
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const { number, code } = req.validated;
      const result = otpService.verifyOtp(number, code);

      const statusCode = result.success ? 200 : 400;
      return res.status(statusCode).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const otpController = new OtpController();
