const Usuario = require('../models/usuarioModel');
const bcrypt = require('bcryptjs');

/**
 * Función para crear un usuario administrador inicial si no existe
 */
const crearUsuarioAdmin = async () => {
  try {
    // Verificar si ya existe un usuario admin
    const adminExists = await Usuario.findOne({ nombreUsuario: 'admin' });

    if (adminExists) {
      console.log('Usuario administrador ya existe');
      return;
    }

    // Generar hash de la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Crear usuario admin
    const admin = await Usuario.create({
      nombreUsuario: 'admin',
      password: hashedPassword,
      rol: 'admin',
      estado: true
    });

    console.log('Usuario administrador creado exitosamente:', admin.nombreUsuario);
  } catch (error) {
    console.error('Error al crear usuario administrador:', error.message);
  }
};

module.exports = { crearUsuarioAdmin };