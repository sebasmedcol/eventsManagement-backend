const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuarioModel');
const Empresa = require('../models/empresaModel');
const Rol = require('../models/rolModel');

const SUPERADMIN_USERNAME =
  process.env.SUPERADMIN_USER && process.env.SUPERADMIN_USER.trim() !== ''
    ? process.env.SUPERADMIN_USER.trim()
    : 'superadmin';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const usuario = await Usuario.findById(decoded.id)
        .select('-password')
        .populate('rol_id', 'nombre descripcion permisos activo');

      if (!usuario) {
        res.status(401);
        throw new Error('Usuario no encontrado');
      }

      let empresa = null;
      if (usuario.empresa) {
        empresa = await Empresa.findById(usuario.empresa);
      }

      if (!empresa) {
        res.status(403);
        throw new Error('Empresa no encontrada o no asignada');
      }

      if (!empresa.estado || empresa.estadoAprobacion !== 'aprobada') {
        res.status(403);
        throw new Error('Acceso bloqueado para esta empresa');
      }

      const userObject = usuario.toObject({ flattenMaps: true });
      userObject.empresaId = usuario.empresa;
      userObject.rol = usuario.rol;
      userObject.empresaNombre = empresa.nombre;
      userObject.isEmpresaSuperAdmin = empresa.nombre === 'SuperAdmin';
      userObject.isOwnerSuperAdmin =
        userObject.isEmpresaSuperAdmin &&
        usuario.rol === 'superadmin' &&
        usuario.esAdminPrincipal === true &&
        usuario.nombreUsuario === SUPERADMIN_USERNAME;
      
      // Si el usuario tiene un rol_id asignado, copiar los permisos del rol
      if (usuario.rol_id && usuario.rol_id.activo) {
        userObject.permisosRol = usuario.rol_id.permisos;
        userObject.nombreRol = usuario.rol_id.nombre;
      }
      
      req.user = userObject;

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

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (req.user?.isEmpresaSuperAdmin && roles.includes('superadmin')) {
      if (!req.user.isOwnerSuperAdmin) {
        res.status(403);
        throw new Error('No autorizado, rol insuficiente');
      }
    }
    if (!req.user || !req.user.rol || !roles.includes(req.user.rol)) {
      res.status(403);
      throw new Error('No autorizado, rol insuficiente');
    }
    next();
  };
};

const authorizePerm = (modulo, accion) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('No autorizado');
    }

    if (req.user.isOwnerSuperAdmin) {
      return next();
    }

    const isEmpresaSuperAdmin = req.user.isEmpresaSuperAdmin === true;
    const rol = req.user.rol;
    // Superadmin, admin y admin principal tienen acceso total
    // EXCEPCIÓN: En la empresa "SuperAdmin" solo el owner tiene acceso total. Los demás respetan permisos.
    if (!isEmpresaSuperAdmin && (rol === 'superadmin' || rol === 'admin' || req.user.esAdminPrincipal)) {
      return next();
    }

    // Primero verificar permisos desde el rol asignado (rol_id)
    let allowed = false;
    
    // Si tiene rol_id asignado, verificar permisos del rol
    if (req.user.permisosRol) {
      const permisosRol = req.user.permisosRol;
      const modPermRol =
        permisosRol instanceof Map ? permisosRol.get(modulo) : permisosRol?.[modulo];
      allowed = modPermRol?.[accion] === true;
    }
    
    // Si no tiene permiso desde el rol, verificar permisos embebidos del usuario (legacy/fallback)
    if (!allowed) {
      const permisos = req.user.permisos;
      const modPerm =
        permisos instanceof Map ? permisos.get(modulo) : permisos?.[modulo];
      allowed = modPerm?.[accion] === true;
    }

    if (!allowed) {
      res.status(403);
      const accionLabel =
        accion === 'crear'
          ? 'crear'
          : accion === 'ver'
          ? 'ver'
          : accion === 'editar'
          ? 'editar'
          : accion === 'eliminar'
          ? 'eliminar'
          : accion;
      throw new Error(
        `No tienes permiso para ${accionLabel} en el módulo ${modulo}`
      );
    }

    next();
  };
};

const requirePlan = (allowedPlans) => {
  const plans = Array.isArray(allowedPlans) ? allowedPlans : [allowedPlans];
  return async (req, res, next) => {
    try {
      if (!req.user?.empresaId) {
        res.status(403);
        throw new Error('Empresa no encontrada o no asignada');
      }
      const Empresa = require('../models/empresaModel');
      const empresa = await Empresa.findById(req.user.empresaId).select('plan');
      const plan = empresa?.plan || 'default';
      if (!plans.includes(plan)) {
        res.status(403);
        throw new Error('Tu plan no incluye acceso a este módulo');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { protect, authorizeRoles, authorizePerm, requirePlan };
