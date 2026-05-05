const Cliente = require('../models/clienteModel');

const normalizarTexto = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const validarEmail = (email) => {
  const v = normalizarTexto(email).toLowerCase();
  if (!v) return null;
  if (v.length > 254) return 'El correo no puede superar 254 caracteres';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(v)) return 'Correo electrónico inválido';
  return null;
};

const documentoTiposPermitidos = ['cedula', 'cedula_extranjeria', 'ppt', 'rut', 'nit'];

/**
 * @desc    Obtener todos los clientes
 * @route   GET /api/clientes
 * @access  Privado
 */
const getClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find({ empresa: req.user.empresaId });
    res.json(clientes);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Obtener un cliente por ID
 * @route   GET /api/clientes/:id
 * @access  Privado
 */
const getClienteById = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!cliente) {
      res.status(404);
      throw new Error('Cliente no encontrado');
    }

    res.json(cliente);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Crear un nuevo cliente
 * @route   POST /api/clientes
 * @access  Privado
 */
const createCliente = async (req, res) => {
  try {
    const {
      nombreCompleto,
      email,
      documentoTipo,
      documentoNumero,
      indicativo,
      telefono,
      direccion,
      estado,
    } = req.body;

    const nombreCompletoTrim = normalizarTexto(nombreCompleto);
    const emailTrim = normalizarTexto(email).toLowerCase();
    const documentoTipoTrim = normalizarTexto(documentoTipo);
    const documentoNumeroTrim = normalizarTexto(documentoNumero);
    const indicativoTrim = normalizarTexto(indicativo) || '+57';
    const telefonoTrim = normalizarTexto(telefono);
    const direccionTrim = normalizarTexto(direccion);

    // Validar datos de entrada
    if (!nombreCompletoTrim || !telefonoTrim || !direccionTrim) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos');
    }

    if (nombreCompletoTrim.length > 50) {
      res.status(400);
      throw new Error('El nombre del cliente no puede superar 50 caracteres');
    }

    const emailError = validarEmail(emailTrim);
    if (emailError) {
      res.status(400);
      throw new Error(emailError);
    }

    if (documentoTipoTrim && !documentoTiposPermitidos.includes(documentoTipoTrim)) {
      res.status(400);
      throw new Error('Tipo de documento inválido');
    }

    if (documentoNumeroTrim.length > 30) {
      res.status(400);
      throw new Error('El número de documento no puede superar 30 caracteres');
    }

    if (indicativoTrim.length > 6) {
      res.status(400);
      throw new Error('El indicativo no puede superar 6 caracteres');
    }

    if (telefonoTrim.length > 15) {
      res.status(400);
      throw new Error('El teléfono no puede superar 15 caracteres');
    }

    // Crear cliente
    const cliente = await Cliente.create({
      nombreCompleto: nombreCompletoTrim,
      email: emailTrim,
      documentoTipo: documentoTipoTrim,
      documentoNumero: documentoNumeroTrim,
      indicativo: indicativoTrim,
      telefono: telefonoTrim,
      direccion: direccionTrim,
      estado: typeof estado === 'boolean' ? estado : true,
      empresa: req.user.empresaId,
    });

    res.status(201).json(cliente);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Actualizar un cliente
 * @route   PUT /api/clientes/:id
 * @access  Privado
 */
const updateCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!cliente) {
      res.status(404);
      throw new Error('Cliente no encontrado');
    }

    const {
      nombreCompleto,
      email,
      documentoTipo,
      documentoNumero,
      indicativo,
      telefono,
      direccion,
      estado,
    } = req.body;

    if (nombreCompleto !== undefined) {
      const v = normalizarTexto(nombreCompleto);
      if (!v) {
        res.status(400);
        throw new Error('El nombre del cliente es obligatorio');
      }
      if (v.length > 50) {
        res.status(400);
        throw new Error('El nombre del cliente no puede superar 50 caracteres');
      }
      cliente.nombreCompleto = v;
    }

    if (email !== undefined) {
      const v = normalizarTexto(email).toLowerCase();
      const emailError = validarEmail(v);
      if (emailError) {
        res.status(400);
        throw new Error(emailError);
      }
      cliente.email = v;
    }

    if (documentoTipo !== undefined) {
      const v = normalizarTexto(documentoTipo);
      if (v && !documentoTiposPermitidos.includes(v)) {
        res.status(400);
        throw new Error('Tipo de documento inválido');
      }
      cliente.documentoTipo = v;
    }

    if (documentoNumero !== undefined) {
      const v = normalizarTexto(documentoNumero);
      if (v.length > 30) {
        res.status(400);
        throw new Error('El número de documento no puede superar 30 caracteres');
      }
      cliente.documentoNumero = v;
    }

    if (indicativo !== undefined) {
      const v = normalizarTexto(indicativo) || '+57';
      if (v.length > 6) {
        res.status(400);
        throw new Error('El indicativo no puede superar 6 caracteres');
      }
      cliente.indicativo = v;
    }

    if (telefono !== undefined) {
      const v = normalizarTexto(telefono);
      if (!v) {
        res.status(400);
        throw new Error('El teléfono del cliente es obligatorio');
      }
      if (v.length > 15) {
        res.status(400);
        throw new Error('El teléfono no puede superar 15 caracteres');
      }
      cliente.telefono = v;
    }

    if (direccion !== undefined) {
      const v = normalizarTexto(direccion);
      if (!v) {
        res.status(400);
        throw new Error('La dirección del cliente es obligatoria');
      }
      cliente.direccion = v;
    }

    if (estado !== undefined) {
      cliente.estado = estado === true || estado === 'true';
    }

    const clienteActualizado = await cliente.save();

    res.json(clienteActualizado);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Eliminar un cliente
 * @route   DELETE /api/clientes/:id
 * @access  Privado
 */
const deleteCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!cliente) {
      res.status(404);
      throw new Error('Cliente no encontrado');
    }

    // Cambiar estado a false en lugar de eliminar
    cliente.estado = false;
    await cliente.save();

    res.json({ message: 'Cliente eliminado' });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
};
