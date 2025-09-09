const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuarioModel');

/**
 * @desc    Autenticar usuario
 * @route   POST /api/auth/login
 * @access  Público
 */
const loginUsuario = async (req, res) => {
  try {
    const { nombreUsuario, password } = req.body;

    // Validar datos de entrada
    if (!nombreUsuario || !password) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos');
    }

    // Verificar si el usuario existe
    const usuario = await Usuario.findOne({ nombreUsuario });

    if (!usuario) {
      res.status(401);
      throw new Error('Credenciales inválidas');
    }

    // Verificar si el usuario está activo
    if (!usuario.estado) {
      res.status(401);
      throw new Error('Usuario inactivo');
    }

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, usuario.password);

    if (!isMatch) {
      res.status(401);
      throw new Error('Credenciales inválidas');
    }

    // Generar token JWT
    const token = generateToken(usuario._id);

    res.json({
      _id: usuario._id,
      nombreUsuario: usuario.nombreUsuario,
      rol: usuario.rol,
      token,
    });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Obtener datos del usuario actual
 * @route   GET /api/auth/me
 * @access  Privado
 */
const getMe = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user._id).select('-password');
    res.json(usuario);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Generar token JWT
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  loginUsuario,
  getMe,
};