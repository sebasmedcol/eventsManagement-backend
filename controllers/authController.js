const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Usuario = require('../models/usuarioModel');
const Empresa = require('../models/empresaModel');
const { inicializarRolesEmpresa } = require('./rolController');

const normalizarTexto = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const validarPassword = (password) => {
  const raw = normalizarTexto(password);
  if (raw.length < 8 || raw.length > 20) {
    return 'La contraseña debe tener entre 8 y 20 caracteres';
  }
  if (/\s/.test(raw)) {
    return 'La contraseña no puede contener espacios';
  }
  if (!/[A-Z]/.test(raw)) {
    return 'La contraseña debe incluir al menos 1 mayúscula';
  }
  if (!/[0-9]/.test(raw)) {
    return 'La contraseña debe incluir al menos 1 número';
  }
  if (!/[^A-Za-z0-9]/.test(raw)) {
    return 'La contraseña debe incluir al menos 1 carácter especial';
  }
  return null;
};

const obtenerEmpresaDefault = async () => {
  let empresa = await Empresa.findOne({ nombre: 'Default' });
  if (!empresa) {
    empresa = await Empresa.create({
      nombre: 'Default',
      nit: '000000000',
      direccion: '',
      telefono: '',
      email: 'default@example.com',
      plan: 'default',
      estado: true,
      fechaCreacion: new Date(),
    });
  }
  return empresa;
};

const register = async (req, res) => {
  try {
    const {
      nombre,
      nit,
      direccion,
      telefono,
      email,
      plan,
      nombreUsuario,
      password,
      adminTelefono,
      adminEmail,
      adminConfirmEmail,
    } = req.body;

    const nombreTrim = normalizarTexto(nombre);
    const nitTrim = normalizarTexto(nit);
    const direccionTrim = normalizarTexto(direccion);
    const telefonoTrim = normalizarTexto(telefono);
    const emailTrim = normalizarTexto(email).toLowerCase();
    const planTrim = normalizarTexto(plan).toLowerCase();
    const nombreUsuarioTrim = normalizarTexto(nombreUsuario);
    const adminTelefonoTrim = normalizarTexto(adminTelefono);
    const adminEmailTrim = normalizarTexto(adminEmail).toLowerCase();
    const adminConfirmEmailTrim = normalizarTexto(adminConfirmEmail).toLowerCase();

    if (
      !nombreTrim ||
      !direccionTrim ||
      !telefonoTrim ||
      !emailTrim ||
      !nombreUsuarioTrim ||
      !password ||
      !adminTelefonoTrim ||
      !adminEmailTrim
    ) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos obligatorios');
    }

    if (nombreTrim.length > 150) {
      res.status(400);
      throw new Error('El nombre de la empresa no puede superar 150 caracteres');
    }
    if (nitTrim && nitTrim.length > 20) {
      res.status(400);
      throw new Error('El NIT no puede superar 20 caracteres');
    }
    if (direccionTrim.length > 200) {
      res.status(400);
      throw new Error('La dirección no puede superar 200 caracteres');
    }
    if (telefonoTrim.length > 15) {
      res.status(400);
      throw new Error('El teléfono no puede superar 15 caracteres');
    }
    if (emailTrim.length > 254) {
      res.status(400);
      throw new Error('El correo no puede superar 254 caracteres');
    }
    if (adminTelefonoTrim.length > 15) {
      res.status(400);
      throw new Error('El teléfono del usuario no puede superar 15 caracteres');
    }
    if (adminEmailTrim.length > 254 || adminConfirmEmailTrim.length > 254) {
      res.status(400);
      throw new Error('El correo del usuario no puede superar 254 caracteres');
    }
    if (nombreUsuarioTrim.length > 50) {
      res.status(400);
      throw new Error('El nombre de usuario no puede superar 50 caracteres');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      res.status(400);
      throw new Error('Correo electrónico inválido');
    }
    if (!emailRegex.test(adminEmailTrim)) {
      res.status(400);
      throw new Error('Correo electrónico del usuario inválido');
    }
    if (adminEmailTrim !== adminConfirmEmailTrim) {
      res.status(400);
      throw new Error('El correo y la confirmación de correo del usuario deben coincidir');
    }

    const passwordError = validarPassword(password);
    if (passwordError) {
      res.status(400);
      throw new Error(passwordError);
    }

    const planesPermitidos = ['free_trial', 'basic', 'pro', 'premium'];
    const planFinal = planesPermitidos.includes(planTrim) ? planTrim : 'free_trial';

    const usuarioExistente = await Usuario.findOne({
      nombreUsuario: new RegExp(`^${escapeRegex(nombreUsuarioTrim)}$`, 'i'),
    });
    if (usuarioExistente) {
      res.status(400);
      throw new Error('El nombre de usuario ya está en uso');
    }

    const empresaNombreExistente = await Empresa.findOne({
      nombre: new RegExp(`^${escapeRegex(nombreTrim)}$`, 'i'),
    });
    if (empresaNombreExistente) {
      res.status(400);
      throw new Error('El nombre de empresa no está disponible');
    }

    const empresaEmailExistente = await Empresa.findOne({ email: emailTrim });
    if (empresaEmailExistente) {
      res.status(400);
      throw new Error('El correo de la empresa ya está en uso');
    }

    const solicitudToken = crypto.randomBytes(16).toString('hex');
    const solicitudExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const empresa = await Empresa.create({
      nombre: nombreTrim,
      nit: nitTrim || '',
      direccion: direccionTrim,
      telefono: telefonoTrim,
      email: emailTrim,
      plan: planFinal,
      estado: false,
      estadoAprobacion: 'pendiente',
      solicitudToken,
      solicitudExpira,
      fechaCreacion: new Date(),
    });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear roles predeterminados para la empresa
    let rolesCreados = null;
    try {
      rolesCreados = await inicializarRolesEmpresa(empresa._id);
    } catch (rolError) {
      console.error('Error al crear roles predeterminados:', rolError);
    }

    const usuario = await Usuario.create({
      nombreUsuario: nombreUsuarioTrim,
      email: adminEmailTrim,
      telefono: adminTelefonoTrim,
      password: hashedPassword,
      rol: 'admin',
      icono: 'userTie',
      esAdminPrincipal: true,
      estado: true,
      empresa: empresa._id,
      // Asignar el rol de Administrador al admin principal si fue creado
      rol_id: rolesCreados?.admin?._id || null,
    });

    const token = generateToken(usuario);

    res.status(201).json({
      usuario: {
        _id: usuario._id,
        nombreUsuario: usuario.nombreUsuario,
        rol: usuario.rol,
        empresa: usuario.empresa,
      },
      empresa: {
        _id: empresa._id,
        nombre: empresa.nombre,
        nit: empresa.nit,
        email: empresa.email,
        plan: empresa.plan,
      },
      token,
    });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const loginUsuario = async (req, res) => {
  try {
    const { nombreUsuario, password } = req.body;

    if (!nombreUsuario || !password) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos');
    }

    const nombreUsuarioTrim = normalizarTexto(nombreUsuario);
    const usuario = await Usuario.findOne({
      nombreUsuario: new RegExp(`^${escapeRegex(nombreUsuarioTrim)}$`, 'i'),
    });

    if (!usuario) {
      res.status(401);
      throw new Error('Credenciales inválidas');
    }

    if (!usuario.estado) {
      res.status(401);
      throw new Error('Usuario inactivo');
    }

    const isMatch = await bcrypt.compare(password, usuario.password);

    if (!isMatch) {
      res.status(401);
      throw new Error('Credenciales inválidas');
    }

    if (!usuario.empresa) {
      const empresaDefault = await obtenerEmpresaDefault();
      usuario.empresa = empresaDefault._id;
      await usuario.save();
    }

    const empresa = await Empresa.findById(usuario.empresa);

    if (!empresa) {
      res.status(403);
      throw new Error('Empresa no encontrada');
    }

    if (empresa.estadoAprobacion === 'pendiente') {
      res.status(403);
      throw new Error('Tu empresa está pendiente de aprobación por el administrador.');
    }

    if (!empresa.estado) {
      res.status(403);
      throw new Error('El acceso de tu empresa ha sido bloqueado. Contacta al administrador.');
    }

    const token = generateToken(usuario);

    res.json({
      _id: usuario._id,
      nombreUsuario: usuario.nombreUsuario,
      rol: usuario.rol,
      empresa: usuario.empresa,
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
    const usuario = await Usuario.findById(req.user._id)
      .select('-password')
      .populate('empresa', 'nombre email plan estado estadoAprobacion')
      .populate('rol_id', 'nombre descripcion permisos activo');
    const out = usuario ? usuario.toObject({ flattenMaps: true }) : null;
    if (!out) {
      res.status(404);
      throw new Error('Usuario no encontrado');
    }
    out.isEmpresaSuperAdmin = req.user?.isEmpresaSuperAdmin === true;
    out.isOwnerSuperAdmin = req.user?.isOwnerSuperAdmin === true;
    res.json(out);
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
const generateToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario._id,
      empresaId: usuario.empresa,
      rol: usuario.rol,
    },
    process.env.JWT_SECRET,
    {
    expiresIn: '30d',
    }
  );
};

const checkEmpresaNombre = async (req, res) => {
  try {
    const nombre = normalizarTexto(req.query.nombre);
    if (!nombre) {
      res.status(400);
      throw new Error('Se requiere el nombre de la empresa');
    }
    if (nombre.length > 150) {
      res.json({ disponible: false });
      return;
    }
    const existente = await Empresa.findOne({
      nombre: new RegExp(`^${escapeRegex(nombre)}$`, 'i'),
    }).select('_id');
    res.json({ disponible: !existente });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const checkNombreUsuario = async (req, res) => {
  try {
    const nombreUsuario = normalizarTexto(req.query.nombreUsuario);
    if (!nombreUsuario) {
      res.status(400);
      throw new Error('Se requiere el nombre de usuario');
    }
    if (nombreUsuario.length > 50) {
      res.json({ disponible: false });
      return;
    }
    const existente = await Usuario.findOne({
      nombreUsuario: new RegExp(`^${escapeRegex(nombreUsuario)}$`, 'i'),
    }).select('_id');
    res.json({ disponible: !existente });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  register,
  loginUsuario,
  getMe,
  checkEmpresaNombre,
  checkNombreUsuario,
};
