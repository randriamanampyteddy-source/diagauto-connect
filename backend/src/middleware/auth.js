const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const hashDeviceId = (value) => crypto
  .createHash('sha256')
  .update(String(value || '').trim())
  .digest('hex');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'client' && decoded.device_hash) {
      const deviceId = req.headers['x-device-id'];
      if (!deviceId || hashDeviceId(deviceId) !== decoded.device_hash) {
        return res.status(401).json({ message: 'Appareil non autorise pour ce compte client' });
      }
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token invalide' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Accès refusé' });
  next();
};

const isClient = (req, res, next) => {
  if (req.user.role !== 'client') return res.status(403).json({ message: 'Accès refusé' });
  next();
};

module.exports = { verifyToken, isAdmin, isClient };
