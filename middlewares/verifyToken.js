/**
 * verifyToken.js
 * 
 * Middleware de verificación de token JWT.
 * Re-exporta `protect` de authMiddleware para mantener
 * compatibilidad con rutas que lo importen directamente.
 */

const { protect } = require('./authMiddleware');

module.exports = protect;