const Factura = require('../models/facturaModel');
const FacturaHasConsecutivo = require('../models/facturaHasConsecutivoModel');

/**
 * @desc    Obtener todas las facturas
 * @route   GET /api/facturas
 * @access  Privado
 */
const getFacturas = async (req, res) => {
  try {
    const facturas = await Factura.find({}).populate('consecutivo');
    res.json(facturas);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Obtener una factura por ID
 * @route   GET /api/facturas/:id
 * @access  Privado
 */
const getFacturaById = async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.id).populate('consecutivo');

    if (!factura) {
      res.status(404);
      throw new Error('Factura no encontrada');
    }

    res.json(factura);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Crear una nueva factura
 * @route   POST /api/facturas
 * @access  Privado
 */
const createFactura = async (req, res) => {
  try {
    const { nombre, consecutivo } = req.body;

    // Validar datos de entrada
    if (!nombre || !consecutivo) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos requeridos');
    }

    // Crear factura
    const factura = await Factura.create({
      nombre,
      consecutivo,
    });

    // Crear relación en la tabla intermedia
    await FacturaHasConsecutivo.create({
      factura: factura._id,
      consecutivo,
    });

    res.status(201).json(factura);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Actualizar una factura
 * @route   PUT /api/facturas/:id
 * @access  Privado
 */
const updateFactura = async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.id);

    if (!factura) {
      res.status(404);
      throw new Error('Factura no encontrada');
    }

    const facturaActualizada = await Factura.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    // Si se actualiza el consecutivo, actualizar también la relación
    if (req.body.consecutivo && req.body.consecutivo !== factura.consecutivo.toString()) {
      await FacturaHasConsecutivo.findOneAndUpdate(
        { factura: factura._id },
        { consecutivo: req.body.consecutivo },
        { new: true }
      );
    }

    res.json(facturaActualizada);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Eliminar una factura
 * @route   DELETE /api/facturas/:id
 * @access  Privado
 */
const deleteFactura = async (req, res) => {
  try {
    const factura = await Factura.findById(req.params.id);

    if (!factura) {
      res.status(404);
      throw new Error('Factura no encontrada');
    }

    // Cambiar estado a false en lugar de eliminar
    factura.estado = false;
    await factura.save();

    res.json({ message: 'Factura eliminada' });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getFacturas,
  getFacturaById,
  createFactura,
  updateFactura,
  deleteFactura,
};