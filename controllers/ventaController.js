const Venta = require('../models/ventaModel');
const Consecutivo = require('../models/consecutivoModel');
const FacturaHasConsecutivo = require('../models/facturaHasConsecutivoModel');

/**
 * @desc    Obtener todas las ventas
 * @route   GET /api/ventas
 * @access  Privado
 */
const getVentas = async (req, res) => {
  try {
    const ventas = await Venta.find({})
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate({
        path: 'facturaHasConsecutivo',
        populate: [
          { path: 'factura' },
          { path: 'consecutivo' }
        ]
      })
      .populate('productos.producto');
    res.json(ventas);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Obtener una venta por ID
 * @route   GET /api/ventas/:id
 * @access  Privado
 */
const getVentaById = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id)
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate({
        path: 'facturaHasConsecutivo',
        populate: [
          { path: 'factura' },
          { path: 'consecutivo' }
        ]
      })
      .populate('productos.producto');

    if (!venta) {
      res.status(404);
      throw new Error('Venta no encontrada');
    }

    res.json(venta);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Crear una nueva venta
 * @route   POST /api/ventas
 * @access  Privado
 */
const createVenta = async (req, res) => {
  try {
    const {
      cliente,
      productos,
      tipoDeServicio,
      duracionDelEvento,
      fechaDelEvento,
      subtotal,
      descuento,
      abono,
      totalPagar,
      clienteTelefono,
      clienteDireccion,
    } = req.body;

    // Validar datos de entrada
    if (
      !cliente ||
      !productos ||
      !tipoDeServicio ||
      !duracionDelEvento ||
      !fechaDelEvento ||
      !subtotal ||
      subtotal < 0 ||
      totalPagar < 0
    ) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos requeridos');
    }

    // Verificar que se proporcionó un facturaHasConsecutivo
    const { facturaHasConsecutivo } = req.body;
    if (!facturaHasConsecutivo) {
      res.status(400);
      throw new Error('Por favor seleccione una factura con consecutivo');
    }

    // Obtener la relación facturaHasConsecutivo para incrementar el contador
    const relacion = await FacturaHasConsecutivo.findById(facturaHasConsecutivo)
      .populate('consecutivo');
    
    if (!relacion) {
      res.status(400);
      throw new Error('La relación factura-consecutivo no existe');
    }
    
    // Incrementar el contador del consecutivo y usar el valor actualizado
    const consecutivoActualizado = await Consecutivo.findByIdAndUpdate(
      relacion.consecutivo._id,
      { $inc: { contador: 1 } },
      { new: true }
    );
    
    // Crear venta
    const venta = await Venta.create({
      facturaHasConsecutivo,
      // Guardar el número de consecutivo utilizado por esta venta
      numeroConsecutivo: consecutivoActualizado?.contador ?? undefined,
      cliente,
      clienteTelefono,
      clienteDireccion,
      productos,
      tipoDeServicio,
      duracionDelEvento,
      fechaDelEvento,
      subtotal,
      descuento: descuento || 0,
      abono: abono || 0,
      totalPagar,
    });

    // Poblar la venta con los datos relacionados
    const ventaCompleta = await Venta.findById(venta._id)
      .populate('cliente', 'nombreCompleto')
      .populate({
        path: 'facturaHasConsecutivo',
        populate: [
          { path: 'factura' },
          { path: 'consecutivo' }
        ]
      })
      .populate('productos.producto');

    res.status(201).json(ventaCompleta);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Actualizar una venta
 * @route   PUT /api/ventas/:id
 * @access  Privado
 */
const updateVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);

    if (!venta) {
      res.status(404);
      throw new Error('Venta no encontrada');
    }

    const ventaActualizada = await Venta.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate({
        path: 'facturaHasConsecutivo',
        populate: [
          { path: 'factura' },
          { path: 'consecutivo' }
        ]
      })
      .populate('productos.producto');

    res.json(ventaActualizada);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Eliminar una venta
 * @route   DELETE /api/ventas/:id
 * @access  Privado
 */
const deleteVenta = async (req, res) => {
  try {
    const venta = await Venta.findById(req.params.id);

    if (!venta) {
      res.status(404);
      throw new Error('Venta no encontrada');
    }

    // Cambiar estado a false en lugar de eliminar
    venta.estado = false;
    await venta.save();

    res.json({ message: 'Venta eliminada' });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getVentas,
  getVentaById,
  createVenta,
  updateVenta,
  deleteVenta,
};