const Consecutivo = require('../models/consecutivoModel');

/**
 * @desc    Obtener todos los consecutivos
 * @route   GET /api/consecutivos
 * @access  Privado
 */
const getConsecutivos = async (req, res) => {
  try {
    const consecutivos = await Consecutivo.find({ empresa: req.user.empresaId });
    res.json(consecutivos);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Obtener un consecutivo por ID
 * @route   GET /api/consecutivos/:id
 * @access  Privado
 */
const getConsecutivoById = async (req, res) => {
  try {
    const consecutivo = await Consecutivo.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!consecutivo) {
      res.status(404);
      throw new Error('Consecutivo no encontrado');
    }

    res.json(consecutivo);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Crear un nuevo consecutivo
 * @route   POST /api/consecutivos
 * @access  Privado
 */
const createConsecutivo = async (req, res) => {
  try {
    const { contador } = req.body;

    // Validar datos de entrada
    if (contador === undefined || contador === null) {
      res.status(400);
      throw new Error('Por favor ingrese el contador');
    }

    // Crear consecutivo
    const consecutivo = await Consecutivo.create({
      contador,
      empresa: req.user.empresaId,
    });

    res.status(201).json(consecutivo);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Actualizar un consecutivo
 * @route   PUT /api/consecutivos/:id
 * @access  Privado
 */
const updateConsecutivo = async (req, res) => {
  try {
    const consecutivo = await Consecutivo.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!consecutivo) {
      res.status(404);
      throw new Error('Consecutivo no encontrado');
    }

    const consecutivoActualizado = await Consecutivo.findOneAndUpdate(
      { _id: req.params.id, empresa: req.user.empresaId },
      req.body,
      { new: true }
    );

    res.json(consecutivoActualizado);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Eliminar un consecutivo
 * @route   DELETE /api/consecutivos/:id
 * @access  Privado
 */
const deleteConsecutivo = async (req, res) => {
  try {
    const consecutivo = await Consecutivo.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!consecutivo) {
      res.status(404);
      throw new Error('Consecutivo no encontrado');
    }

    // Cambiar estado a false en lugar de eliminar
    consecutivo.estado = false;
    await consecutivo.save();

    res.json({ message: 'Consecutivo eliminado' });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getConsecutivos,
  getConsecutivoById,
  createConsecutivo,
  updateConsecutivo,
  deleteConsecutivo,
};
