const Rol = require('../models/rolModel');
const Usuario = require('../models/usuarioModel');

const normalizarTexto = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const MODULOS_PERMISOS = [
  'dashboard',
  'clientes',
  'productos',
  'ventas',
  'eventos',
  'eventosPremium',
  'consecutivos',
  'cotizaciones',
  'disponibilidad',
  'configuracion',
  'usuarios',
  'roles',
  'dashboard_global',
  'empresas',
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

const buildPermisosAdmin = () => {
  const permisos = {};
  MODULOS_PERMISOS.forEach((modulo) => {
    permisos[modulo] = { crear: true, ver: true, editar: true, eliminar: true };
  });
  return permisos;
};

const buildPermisosOperador = () => {
  const permisos = {};
  // Operador puede ver, crear y editar, pero no eliminar en los módulos principales
  const modulosOperador = ['clientes', 'productos', 'ventas', 'eventos', 'consecutivos', 'cotizaciones', 'disponibilidad', 'dashboard', 'configuracion'];
  modulosOperador.forEach((modulo) => {
    if (modulo === 'disponibilidad' || modulo === 'dashboard') {
      // Solo ver para estos módulos
      permisos[modulo] = { crear: false, ver: true, editar: false, eliminar: false };
    } else if (modulo === 'configuracion') {
      // Ver y editar para configuración
      permisos[modulo] = { crear: false, ver: true, editar: true, eliminar: false };
    } else {
      permisos[modulo] = { crear: true, ver: true, editar: true, eliminar: false };
    }
  });
  return permisos;
};

// Crear roles predeterminados para una empresa
const crearRolesPredeterminados = async (empresaId) => {
  try {
    // Verificar si ya existen roles para esta empresa
    const existentes = await Rol.countDocuments({ empresa: empresaId });
    if (existentes > 0) {
      return { message: 'La empresa ya tiene roles configurados' };
    }

    // Crear rol Administrador
    const rolAdmin = await Rol.create({
      nombre: 'Administrador',
      descripcion: 'Acceso total a todos los módulos',
      permisos: buildPermisosAdmin(),
      empresa: empresaId,
      activo: true,
      esPredeterminado: true,
    });

    // Crear rol Operador
    const rolOperador = await Rol.create({
      nombre: 'Operador',
      descripcion: 'Acceso limitado sin permisos de eliminación ni gestión de usuarios',
      permisos: buildPermisosOperador(),
      empresa: empresaId,
      activo: true,
      esPredeterminado: true,
    });

    return { admin: rolAdmin, operador: rolOperador };
  } catch (error) {
    console.error('Error al crear roles predeterminados:', error);
    throw error;
  }
};

// Obtener todos los roles de la empresa
const getRoles = async (req, res) => {
  try {
    const roles = await Rol.find({ empresa: req.user.empresaId });
    res.json(roles);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

// Obtener rol por ID
const getRolById = async (req, res) => {
  try {
    const rol = await Rol.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!rol) {
      res.status(404);
      throw new Error('Rol no encontrado');
    }

    res.json(rol);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

// Crear un nuevo rol
const createRol = async (req, res) => {
  try {
    const { nombre, descripcion, permisos, activo } = req.body;
    const nombreTrim = normalizarTexto(nombre);
    const descripcionTrim = normalizarTexto(descripcion);
    const permisosFinal = normalizarPermisos(permisos);

    if (!nombreTrim) {
      res.status(400);
      throw new Error('Por favor ingrese un nombre para el rol');
    }

    if (nombreTrim.length > 50) {
      res.status(400);
      throw new Error('El nombre del rol no puede superar 50 caracteres');
    }

    if (descripcionTrim.length > 200) {
      res.status(400);
      throw new Error('La descripción no puede superar 200 caracteres');
    }

    // Verificar que no exista otro rol con el mismo nombre en la empresa
    const existente = await Rol.findOne({
      nombre: new RegExp(`^${escapeRegex(nombreTrim)}$`, 'i'),
      empresa: req.user.empresaId,
    });

    if (existente) {
      res.status(400);
      throw new Error('Ya existe un rol con este nombre en la empresa');
    }

    const rol = await Rol.create({
      nombre: nombreTrim,
      descripcion: descripcionTrim,
      permisos: permisosFinal,
      empresa: req.user.empresaId,
      activo: activo !== undefined ? activo : true,
      esPredeterminado: false,
    });

    res.status(201).json(rol);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

// Actualizar un rol
const updateRol = async (req, res) => {
  try {
    const rol = await Rol.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!rol) {
      res.status(404);
      throw new Error('Rol no encontrado');
    }

    const { nombre, descripcion, permisos, activo } = req.body;

    if (nombre !== undefined) {
      const nombreTrim = normalizarTexto(nombre);
      if (!nombreTrim) {
        res.status(400);
        throw new Error('Por favor ingrese un nombre para el rol');
      }
      if (nombreTrim.length > 50) {
        res.status(400);
        throw new Error('El nombre del rol no puede superar 50 caracteres');
      }

      // Verificar que no exista otro rol con el mismo nombre
      const existente = await Rol.findOne({
        nombre: new RegExp(`^${escapeRegex(nombreTrim)}$`, 'i'),
        empresa: req.user.empresaId,
        _id: { $ne: rol._id },
      });

      if (existente) {
        res.status(400);
        throw new Error('Ya existe otro rol con este nombre en la empresa');
      }

      rol.nombre = nombreTrim;
    }

    if (descripcion !== undefined) {
      const descripcionTrim = normalizarTexto(descripcion);
      if (descripcionTrim.length > 200) {
        res.status(400);
        throw new Error('La descripción no puede superar 200 caracteres');
      }
      rol.descripcion = descripcionTrim;
    }

    if (permisos !== undefined) {
      rol.permisos = normalizarPermisos(permisos);
    }

    if (activo !== undefined) {
      // No permitir desactivar un rol predeterminado si tiene usuarios asignados
      if (!activo && rol.esPredeterminado) {
        const usuariosConRol = await Usuario.countDocuments({
          rol_id: rol._id,
          empresa: req.user.empresaId,
        });
        if (usuariosConRol > 0) {
          res.status(400);
          throw new Error(
            `No se puede desactivar este rol porque tiene ${usuariosConRol} usuario(s) asignado(s)`
          );
        }
      }
      rol.activo = activo;
    }

    await rol.save();
    res.json(rol);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

// Eliminar un rol
const deleteRol = async (req, res) => {
  try {
    const rol = await Rol.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!rol) {
      res.status(404);
      throw new Error('Rol no encontrado');
    }

    // No permitir eliminar roles predeterminados
    if (rol.esPredeterminado) {
      res.status(400);
      throw new Error('No se puede eliminar un rol predeterminado');
    }

    // Verificar que no haya usuarios con este rol asignado
    const usuariosConRol = await Usuario.countDocuments({
      rol_id: rol._id,
      empresa: req.user.empresaId,
    });

    if (usuariosConRol > 0) {
      res.status(400);
      throw new Error(
        `No se puede eliminar este rol porque tiene ${usuariosConRol} usuario(s) asignado(s)`
      );
    }

    await Rol.deleteOne({ _id: rol._id });
    res.json({ message: 'Rol eliminado correctamente', id: req.params.id });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

// Inicializar roles para una empresa (llamado desde authController al registrar empresa)
const inicializarRolesEmpresa = async (empresaId) => {
  return crearRolesPredeterminados(empresaId);
};

module.exports = {
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol,
  inicializarRolesEmpresa,
  crearRolesPredeterminados,
  MODULOS_PERMISOS,
};
