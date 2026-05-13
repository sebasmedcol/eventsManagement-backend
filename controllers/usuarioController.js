const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuarioModel');
const Rol = require('../models/rolModel');

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

const MODULOS_PERMISOS = [
  'clientes',
  'productos',
  'ventas',
  'eventos',
  'consecutivos',
  'cotizaciones',
  'disponibilidad',
  'usuarios',
  'facturas',
];

const normalizarPermisos = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const modulo of MODULOS_PERMISOS) {
    const v = input[modulo];
    if (!v || typeof v !== 'object') continue;
    out[modulo] = {
      crear: v.crear === true,
      ver: v.ver === true,
      editar: v.editar === true,
      eliminar: v.eliminar === true,
    };
  }
  return out;
};

const getIconoPorRol = (rol) => {
  if (rol === 'superadmin') return 'userShield';
  if (rol === 'admin') return 'userTie';
  if (rol === 'operador') return 'userCog';
  return 'user';
};

const getUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find({ empresa: req.user.empresaId })
      .select('-password')
      .populate('rol_id', 'nombre descripcion permisos activo');
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const getUsuarioById = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    })
      .select('-password')
      .populate('rol_id', 'nombre descripcion permisos activo');

    if (!usuario) {
      res.status(404);
      throw new Error('Usuario no encontrado');
    }

    if (usuario.esAdminPrincipal) {
      if (req.body.rol && req.body.rol !== usuario.rol) {
        res.status(400);
        throw new Error(
          'No se puede cambiar el rol del usuario administrador principal'
        );
      }
      if (
        req.body.estado !== undefined &&
        req.body.estado !== usuario.estado
      ) {
        res.status(400);
        throw new Error(
          'No se puede cambiar el estado del usuario administrador principal'
        );
      }
    }

    res.json(usuario);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const createUsuario = async (req, res) => {
  try {
    const { nombreUsuario, password, rol, estado, email, indicativo, telefono, icono, permisos, rol_id } = req.body;
    const nombreUsuarioTrim = normalizarTexto(nombreUsuario);
    const emailTrim = normalizarTexto(email).toLowerCase();
    const indicativoTrim = normalizarTexto(indicativo) || '+57';
    const telefonoTrim = normalizarTexto(telefono);
    const rolFinal = normalizarTexto(rol) || 'operador';
    const permisosFinal = normalizarPermisos(permisos);

    if (rolFinal === 'superadmin' && req.user?.rol !== 'superadmin') {
      res.status(403);
      throw new Error('Solo el superadmin puede crear usuarios con rol superadmin');
    }

    if (!nombreUsuarioTrim || !password) {
      res.status(400);
      throw new Error('Por favor ingrese nombre de usuario y contraseña');
    }

    if (nombreUsuarioTrim.length > 50) {
      res.status(400);
      throw new Error('El nombre de usuario no puede superar 50 caracteres');
    }

    if (emailTrim && emailTrim.length > 254) {
      res.status(400);
      throw new Error('El correo no puede superar 254 caracteres');
    }
    if (telefonoTrim && telefonoTrim.length > 15) {
      res.status(400);
      throw new Error('El teléfono no puede superar 15 caracteres');
    }

    const passwordError = validarPassword(password);
    if (passwordError) {
      res.status(400);
      throw new Error(passwordError);
    }

    const existente = await Usuario.findOne({
      nombreUsuario: new RegExp(`^${escapeRegex(nombreUsuarioTrim)}$`, 'i'),
    }).select('_id');
    if (existente) {
      res.status(400);
      throw new Error('El nombre de usuario ya está en uso');
    }

    // Validar rol_id si se proporciona
    let rolIdFinal = null;
    if (rol_id) {
      const rolExiste = await Rol.findOne({
        _id: rol_id,
        empresa: req.user.empresaId,
        activo: true,
      });
      if (!rolExiste) {
        res.status(400);
        throw new Error('El rol seleccionado no existe o no está activo');
      }
      rolIdFinal = rol_id;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const usuario = await Usuario.create({
      nombreUsuario: nombreUsuarioTrim,
      email: emailTrim || undefined,
      indicativo: indicativoTrim,
      telefono: telefonoTrim || undefined,
      password: hashedPassword,
      rol: rolFinal || 'operador',
      icono: normalizarTexto(icono) || getIconoPorRol(rolFinal),
      estado: estado !== undefined ? estado : true,
      permisos: permisosFinal,
      rol_id: rolIdFinal,
      empresa: req.user.empresaId,
    });

    // Populate rol_id antes de responder
    await usuario.populate('rol_id', 'nombre descripcion permisos activo');

    const respuesta = usuario.toObject();
    delete respuesta.password;

    res.status(201).json(respuesta);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const updateUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!usuario) {
      res.status(404);
      throw new Error('Usuario no encontrado');
    }

    if (req.body.password) {
      const passwordError = validarPassword(req.body.password);
      if (passwordError) {
        res.status(400);
        throw new Error(passwordError);
      }
      const salt = await bcrypt.genSalt(10);
      usuario.password = await bcrypt.hash(req.body.password, salt);
    }

    if (req.body.nombreUsuario !== undefined) {
      const nombreUsuarioTrim = normalizarTexto(req.body.nombreUsuario);
      if (!nombreUsuarioTrim) {
        res.status(400);
        throw new Error('Por favor ingrese un nombre de usuario');
      }
      if (nombreUsuarioTrim.length > 50) {
        res.status(400);
        throw new Error('El nombre de usuario no puede superar 50 caracteres');
      }
      const existente = await Usuario.findOne({
        nombreUsuario: new RegExp(`^${escapeRegex(nombreUsuarioTrim)}$`, 'i'),
        _id: { $ne: usuario._id },
      });
      if (existente) {
        res.status(400);
        throw new Error('El nombre de usuario ya está en uso');
      }
      usuario.nombreUsuario = nombreUsuarioTrim;
    }

    if (req.body.rol !== undefined) {
      if (req.body.rol === 'superadmin' && req.user?.rol !== 'superadmin') {
        res.status(403);
        throw new Error(
          'Solo el superadmin puede asignar el rol superadmin a otros usuarios'
        );
      }
      usuario.rol = req.body.rol;
      if (!usuario.icono) {
        usuario.icono = getIconoPorRol(req.body.rol);
      }
    }

    if (req.body.estado !== undefined) {
      usuario.estado = req.body.estado;
    }

    if (req.body.email !== undefined) {
      const emailTrim = normalizarTexto(req.body.email).toLowerCase();
      if (emailTrim && emailTrim.length > 254) {
        res.status(400);
        throw new Error('El correo no puede superar 254 caracteres');
      }
      usuario.email = emailTrim || undefined;
    }

    if (req.body.indicativo !== undefined) {
      usuario.indicativo = normalizarTexto(req.body.indicativo) || '+57';
    }

    if (req.body.telefono !== undefined) {
      const telefonoTrim = normalizarTexto(req.body.telefono);
      if (telefonoTrim && telefonoTrim.length > 15) {
        res.status(400);
        throw new Error('El teléfono no puede superar 15 caracteres');
      }
      usuario.telefono = telefonoTrim || undefined;
    }

    if (req.body.icono !== undefined) {
      usuario.icono = normalizarTexto(req.body.icono) || '';
    }

    if (req.body.permisos !== undefined) {
      usuario.permisos = normalizarPermisos(req.body.permisos);
    }

    // Manejar rol_id (puede ser null para quitar el rol asignado)
    if (req.body.rol_id !== undefined) {
      if (req.body.rol_id === null || req.body.rol_id === '') {
        usuario.rol_id = null;
      } else {
        const rolExiste = await Rol.findOne({
          _id: req.body.rol_id,
          empresa: req.user.empresaId,
          activo: true,
        });
        if (!rolExiste) {
          res.status(400);
          throw new Error('El rol seleccionado no existe o no está activo');
        }
        usuario.rol_id = req.body.rol_id;
      }
    }

    await usuario.save();

    // Populate rol_id antes de responder
    await usuario.populate('rol_id', 'nombre descripcion permisos activo');

    const respuesta = usuario.toObject();
    delete respuesta.password;

    res.json(respuesta);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const deleteUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!usuario) {
      res.status(404);
      throw new Error('Usuario no encontrado');
    }

    if (usuario.esAdminPrincipal) {
      res.status(400);
      throw new Error(
        'No se puede desactivar el usuario administrador principal'
      );
    }

    usuario.estado = false;
    await usuario.save();

    const respuesta = usuario.toObject();
    delete respuesta.password;

    res.json(respuesta);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
};
