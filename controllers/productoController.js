const Producto = require('../models/productoModel');

const normalizarTexto = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const tiposServicioPermitidos = ['Alquiler', 'Venta'];
const tiposCobroPermitidos = ['unidad', 'hora'];

/**
 * @desc    Obtener todos los productos
 * @route   GET /api/productos
 * @access  Privado
 */
const getProductos = async (req, res) => {
  try {
    const productos = await Producto.find({ empresa: req.user.empresaId });
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
    const producto = await Producto.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

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
    const { nombre, descripcion, tipoDeServicio, tipoDeCobro, precio, cantidadTotal } =
      req.body;

    const nombreTrim = normalizarTexto(nombre);
    const descripcionTrim = normalizarTexto(descripcion);
    const tipoDeServicioTrim = normalizarTexto(tipoDeServicio) || 'Venta';
    const tipoDeCobroTrim = normalizarTexto(tipoDeCobro) || 'unidad';

    // Validar datos de entrada
    if (!nombreTrim || !descripcionTrim || precio === undefined || precio === null || precio === '') {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos');
    }

    if (!tiposServicioPermitidos.includes(tipoDeServicioTrim)) {
      res.status(400);
      throw new Error('Tipo de servicio inválido');
    }

    if (!tiposCobroPermitidos.includes(tipoDeCobroTrim)) {
      res.status(400);
      throw new Error('Tipo de cobro inválido');
    }

    const precioNumero = Number(precio);
    if (Number.isNaN(precioNumero) || precioNumero < 0) {
      res.status(400);
      throw new Error('El precio debe ser un número mayor o igual a cero');
    }

    const cantidadNumero = cantidadTotal === undefined || cantidadTotal === null || cantidadTotal === ''
      ? 0
      : Number(cantidadTotal);
    if (Number.isNaN(cantidadNumero) || cantidadNumero < 0) {
      res.status(400);
      throw new Error('La cantidad debe ser un número mayor o igual a cero');
    }

    // Crear producto
    const producto = await Producto.create({
      nombre: nombreTrim,
      descripcion: descripcionTrim,
      tipoDeServicio: tipoDeServicioTrim,
      tipoDeCobro: tipoDeCobroTrim,
      precio: precioNumero,
      cantidadTotal: cantidadNumero,
      empresa: req.user.empresaId,
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
    const producto = await Producto.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!producto) {
      res.status(404);
      throw new Error('Producto no encontrado');
    }

    const { nombre, descripcion, tipoDeServicio, tipoDeCobro, precio, cantidadTotal, estado } =
      req.body;

    if (nombre !== undefined) {
      const v = normalizarTexto(nombre);
      if (!v) {
        res.status(400);
        throw new Error('El nombre del producto es obligatorio');
      }
      producto.nombre = v;
    }

    if (descripcion !== undefined) {
      const v = normalizarTexto(descripcion);
      if (!v) {
        res.status(400);
        throw new Error('La descripción del producto es obligatoria');
      }
      producto.descripcion = v;
    }

    if (tipoDeServicio !== undefined) {
      const v = normalizarTexto(tipoDeServicio) || 'Venta';
      if (!tiposServicioPermitidos.includes(v)) {
        res.status(400);
        throw new Error('Tipo de servicio inválido');
      }
      producto.tipoDeServicio = v;
    }

    if (tipoDeCobro !== undefined) {
      const v = normalizarTexto(tipoDeCobro) || 'unidad';
      if (!tiposCobroPermitidos.includes(v)) {
        res.status(400);
        throw new Error('Tipo de cobro inválido');
      }
      producto.tipoDeCobro = v;
    }

    if (precio !== undefined) {
      const v = Number(precio);
      if (Number.isNaN(v) || v < 0) {
        res.status(400);
        throw new Error('El precio debe ser un número mayor o igual a cero');
      }
      producto.precio = v;
    }

    if (cantidadTotal !== undefined) {
      const v = Number(cantidadTotal);
      if (Number.isNaN(v) || v < 0) {
        res.status(400);
        throw new Error('La cantidad debe ser un número mayor o igual a cero');
      }
      producto.cantidadTotal = v;
    }

    if (estado !== undefined) {
      producto.estado = estado === true || estado === 'true';
    }

    const productoActualizado = await producto.save();

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
    const producto = await Producto.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

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
