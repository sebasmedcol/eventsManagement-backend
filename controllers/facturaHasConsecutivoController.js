const FacturaHasConsecutivo = require('../models/facturaHasConsecutivoModel');

/**
 * @desc    Obtener todas las relaciones factura-consecutivo
 * @route   GET /api/factura-consecutivo
 * @access  Privado
 */
const getFacturaHasConsecutivos = async (req, res) => {
  try {
    const relaciones = await FacturaHasConsecutivo.find({})
      .populate('factura')
      .populate('consecutivo');
    res.json(relaciones);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Obtener una relación factura-consecutivo por ID
 * @route   GET /api/factura-consecutivo/:id
 * @access  Privado
 */
const getFacturaHasConsecutivoById = async (req, res) => {
  try {
    const relacion = await FacturaHasConsecutivo.findById(req.params.id)
      .populate('factura')
      .populate('consecutivo');

    if (!relacion) {
      res.status(404);
      throw new Error('Relación no encontrada');
    }

    res.json(relacion);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Crear una nueva relación factura-consecutivo
 * @route   POST /api/factura-consecutivo
 * @access  Privado
 */
const createFacturaHasConsecutivo = async (req, res) => {
  try {
    const { factura, consecutivo } = req.body;

    // Validar datos de entrada
    if (!factura || !consecutivo) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos requeridos');
    }

    // Verificar si ya existe una relación para esta factura
    const relacionExistente = await FacturaHasConsecutivo.findOne({ factura });
    if (relacionExistente) {
      res.status(400);
      throw new Error('Esta factura ya tiene un consecutivo asignado');
    }

    // Crear relación
    const relacion = await FacturaHasConsecutivo.create({
      factura,
      consecutivo,
    });

    res.status(201).json(relacion);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Actualizar una relación factura-consecutivo
 * @route   PUT /api/factura-consecutivo/:id
 * @access  Privado
 */
const updateFacturaHasConsecutivo = async (req, res) => {
  try {
    const relacion = await FacturaHasConsecutivo.findById(req.params.id);

    if (!relacion) {
      res.status(404);
      throw new Error('Relación no encontrada');
    }

    const relacionActualizada = await FacturaHasConsecutivo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(relacionActualizada);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Eliminar una relación factura-consecutivo
 * @route   DELETE /api/factura-consecutivo/:id
 * @access  Privado
 */
const deleteFacturaHasConsecutivo = async (req, res) => {
  try {
    const relacion = await FacturaHasConsecutivo.findById(req.params.id);

    if (!relacion) {
      res.status(404);
      throw new Error('Relación no encontrada');
    }

    await relacion.remove();

    res.json({ message: 'Relación eliminada' });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getFacturaHasConsecutivos,
  getFacturaHasConsecutivoById,
  createFacturaHasConsecutivo,
  updateFacturaHasConsecutivo,
  deleteFacturaHasConsecutivo,
};