const Producto = require('../models/productoModel');

/**
 * @desc    Obtener todos los productos
 * @route   GET /api/productos
 * @access  Privado
 */
const getProductos = async (req, res) => {
  try {
    const productos = await Producto.find({});
    res.json(productos);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Obtener un producto por ID
 * @route   GET /api/productos/:id
 * @access  Privado
 */
const getProductoById = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      res.status(404);
      throw new Error('Producto no encontrado');
    }

    res.json(producto);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Crear un nuevo producto
 * @route   POST /api/productos
 * @access  Privado
 */
const createProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio } = req.body;

    // Validar datos de entrada
    if (!nombre || !descripcion || !precio) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos');
    }

    // Crear producto
    const producto = await Producto.create({
      nombre,
      descripcion,
      precio,
    });

    res.status(201).json(producto);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Actualizar un producto
 * @route   PUT /api/productos/:id
 * @access  Privado
 */
const updateProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      res.status(404);
      throw new Error('Producto no encontrado');
    }

    const productoActualizado = await Producto.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(productoActualizado);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Eliminar un producto
 * @route   DELETE /api/productos/:id
 * @access  Privado
 */
const deleteProducto = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      res.status(404);
      throw new Error('Producto no encontrado');
    }

    // Cambiar estado a false en lugar de eliminar
    producto.estado = false;
    await producto.save();

    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
};