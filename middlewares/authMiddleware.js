const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuarioModel');

/**
 * Middleware para proteger rutas que requieren autenticación
 */
const protect = async (req, res, next) => {
  let token;

  // Verificar si hay token en el header de autorización
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtener token del header
      token = req.headers.authorization.split(' ')[1];

      // Verificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Obtener usuario del token (sin la contraseña)
      req.user = await Usuario.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Usuario no encontrado');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('No autorizado, token inválido');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('No autorizado, no se proporcionó token');
  }
};

module.exports = { protect };