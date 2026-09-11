export function validateSendMessage(req, res, next) {
  const body = req.body || {};

  const rawNumber = body.number || body.phone || body.to || body.phoneNumber || body.recipient;
  const rawMessage = body.message || body.text || body.body || body.msg;

  if (!rawNumber) {
    return res.status(400).json({
      success: false,
      error: 'Field "number" (or "phone" / "to") is required.'
    });
  }

  if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Field "message" (or "text") is required and must be a non-empty string.'
    });
  }

  const cleanNumber = String(rawNumber).replace(/\D/g, '');
  if (cleanNumber.length < 7 || cleanNumber.length > 15) {
    return res.status(400).json({
      success: false,
      error: `Invalid phone number "${rawNumber}". Must be 7 to 15 digits including country code (e.g. 201123456789 or 15551234567).`
    });
  }

  req.validated = {
    number: cleanNumber,
    message: rawMessage.trim()
  };

  next();
}

export function validateRequestOtp(req, res, next) {
  const body = req.body || {};
  const rawNumber = body.number || body.phone || body.phoneNumber || body.to;

  if (!rawNumber) {
    return res.status(400).json({
      success: false,
      error: 'Field "number" (or "phoneNumber") is required.'
    });
  }

  const cleanNumber = String(rawNumber).replace(/\D/g, '');
  if (cleanNumber.length < 7 || cleanNumber.length > 15) {
    return res.status(400).json({
      success: false,
      error: `Invalid phone number "${rawNumber}". Must be 7 to 15 digits with country code.`
    });
  }

  req.validated = {
    number: cleanNumber,
    appName: body.appName || 'My App',
    length: parseInt(body.length || '6', 10),
    expiresInMinutes: parseInt(body.expiresInMinutes || '5', 10)
  };

  next();
}

export function validateVerifyOtp(req, res, next) {
  const body = req.body || {};
  const rawNumber = body.number || body.phone || body.phoneNumber || body.to;
  const rawCode = body.code || body.otp;

  if (!rawNumber) {
    return res.status(400).json({
      success: false,
      error: 'Field "number" (or "phoneNumber") is required.'
    });
  }

  if (!rawCode) {
    return res.status(400).json({
      success: false,
      error: 'Field "code" (or "otp") is required.'
    });
  }

  const cleanNumber = String(rawNumber).replace(/\D/g, '');
  const cleanCode = String(rawCode).trim();

  req.validated = {
    number: cleanNumber,
    code: cleanCode
  };

  next();
}
