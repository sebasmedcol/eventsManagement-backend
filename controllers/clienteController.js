const Cliente = require('../models/clienteModel');

/**
 * @desc    Obtener todos los clientes
 * @route   GET /api/clientes
 * @access  Privado
 */
const getClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find({});
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
    const cliente = await Cliente.findById(req.params.id);

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
    const { nombreCompleto, telefono, direccion } = req.body;

    // Validar datos de entrada
    if (!nombreCompleto || !telefono || !direccion) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos');
    }

    // Crear cliente
    const cliente = await Cliente.create({
      nombreCompleto,
      telefono,
      direccion,
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
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      res.status(404);
      throw new Error('Cliente no encontrado');
    }

    const clienteActualizado = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

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
    const cliente = await Cliente.findById(req.params.id);

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