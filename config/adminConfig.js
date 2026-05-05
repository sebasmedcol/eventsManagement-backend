const Usuario = require('../models/usuarioModel');
const Empresa = require('../models/empresaModel');
const bcrypt = require('bcryptjs');

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

const obtenerEmpresaSuperAdmin = async () => {
  let empresa = await Empresa.findOne({ nombre: 'SuperAdmin' });
  if (!empresa) {
    empresa = await Empresa.create({
      nombre: 'SuperAdmin',
      nit: '999999999',
      direccion: '',
      telefono: '',
      email: 'superadmin@example.com',
      plan: 'super',
      estado: true,
      estadoAprobacion: 'aprobada',
      fechaCreacion: new Date(),
    });
  }
  return empresa;
};

const crearUsuarioAdmin = async () => {
  try {
    const adminExists = await Usuario.findOne({ nombreUsuario: 'admin' });
    const empresaDefault = await obtenerEmpresaDefault();

    if (adminExists) {
      let updated = false;
      if (!adminExists.empresa) {
        adminExists.empresa = empresaDefault._id;
        updated = true;
      }
      if (!adminExists.esAdminPrincipal) {
        adminExists.esAdminPrincipal = true;
        updated = true;
      }
      if (updated) {
        await adminExists.save();
      }
      console.log('Usuario administrador ya existe');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await Usuario.create({
      nombreUsuario: 'admin',
      password: hashedPassword,
      rol: 'admin',
      esAdminPrincipal: true,
      estado: true,
      empresa: empresaDefault._id,
    });

    console.log('Usuario administrador creado exitosamente:', admin.nombreUsuario);
  } catch (error) {
    console.error('Error al crear usuario administrador:', error.message);
  }
};

const crearUsuarioSuperAdmin = async () => {
  try {
    const nombreUsuario =
      process.env.SUPERADMIN_USER && process.env.SUPERADMIN_USER.trim() !== ''
        ? process.env.SUPERADMIN_USER.trim()
        : 'superadmin';

    const superadminExists = await Usuario.findOne({ nombreUsuario });
    const empresaSuper = await obtenerEmpresaSuperAdmin();

    if (superadminExists) {
      let updated = false;
      if (!superadminExists.empresa) {
        superadminExists.empresa = empresaSuper._id;
        updated = true;
      }
      if (!superadminExists.esAdminPrincipal) {
        superadminExists.esAdminPrincipal = true;
        updated = true;
      }
      if (updated) {
        await superadminExists.save();
      }
      console.log('Usuario superadmin ya existe');
      return;
    }

    const rawPassword =
      process.env.SUPERADMIN_PASSWORD &&
      process.env.SUPERADMIN_PASSWORD.trim() !== ''
        ? process.env.SUPERADMIN_PASSWORD.trim()
        : 'superadmin123';

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    const superadmin = await Usuario.create({
      nombreUsuario,
      password: hashedPassword,
      rol: 'superadmin',
      esAdminPrincipal: true,
      estado: true,
      empresa: empresaSuper._id,
    });

    console.log('Usuario superadmin creado:', superadmin.nombreUsuario);
  } catch (error) {
    console.error('Error al crear usuario superadmin:', error.message);
  }
};

module.exports = { crearUsuarioAdmin, crearUsuarioSuperAdmin };
