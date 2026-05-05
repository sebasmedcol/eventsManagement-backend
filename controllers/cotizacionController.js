const Cotizacion = require('../models/cotizacionModel');
const Venta = require('../models/ventaModel');
const Consecutivo = require('../models/consecutivoModel');
const FacturaHasConsecutivo = require('../models/facturaHasConsecutivoModel');
const { validarDisponibilidad } = require('../services/inventarioService');

const getCotizaciones = async (req, res) => {
  try {
    const cotizaciones = await Cotizacion.find({ empresa: req.user.empresaId })
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('productos.producto');
    res.json(cotizaciones);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const getCotizacionById = async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    })
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('productos.producto');

    if (!cotizacion) {
      res.status(404);
      throw new Error('Cotización no encontrada');
    }

    res.json(cotizacion);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const createCotizacion = async (req, res) => {
  try {
    const { cliente, productos, total, estado } = req.body;

    if (!cliente || !productos || !Array.isArray(productos) || productos.length === 0 || total == null) {
      res.status(400);
      throw new Error('Por favor ingrese cliente, productos y total');
    }

    const cotizacion = await Cotizacion.create({
      empresa: req.user.empresaId,
      cliente,
      productos,
      total,
      estado: estado || 'borrador',
    });

    const cotizacionCompleta = await Cotizacion.findById(cotizacion._id)
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('productos.producto');

    res.status(201).json(cotizacionCompleta);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const updateCotizacion = async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!cotizacion) {
      res.status(404);
      throw new Error('Cotización no encontrada');
    }

    const cotizacionActualizada = await Cotizacion.findOneAndUpdate(
      { _id: req.params.id, empresa: req.user.empresaId },
      req.body,
      { new: true }
    )
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('productos.producto');

    res.json(cotizacionActualizada);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const deleteCotizacion = async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findOneAndDelete({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!cotizacion) {
      res.status(404);
      throw new Error('Cotización no encontrada');
    }

    res.json({ message: 'Cotización eliminada' });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const convertirCotizacionAVenta = async (req, res) => {
  try {
    const cotizacion = await Cotizacion.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    })
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('productos.producto');

    if (!cotizacion) {
      res.status(404);
      throw new Error('Cotización no encontrada');
    }

    const {
      facturaHasConsecutivo,
      tipoDeServicio,
      duracionDelEvento,
      fechaDelEvento,
      fechaInicio,
      fechaFin,
      descuento,
      abono,
      clienteTelefono,
      clienteDireccion,
    } = req.body;

    if (
      !facturaHasConsecutivo ||
      !tipoDeServicio ||
      !duracionDelEvento ||
      !fechaDelEvento ||
      !fechaInicio ||
      !fechaFin
    ) {
      res.status(400);
      throw new Error('Por favor ingrese facturaHasConsecutivo, tipoDeServicio, duracionDelEvento y fechaDelEvento');
    }

    const relacion = await FacturaHasConsecutivo.findOne({
      _id: facturaHasConsecutivo,
      empresa: req.user.empresaId,
    }).populate('consecutivo');

    if (!relacion) {
      res.status(400);
      throw new Error('La relación factura-consecutivo no existe para esta empresa');
    }

    const consecutivoActualizado = await Consecutivo.findOneAndUpdate(
      { _id: relacion.consecutivo._id, empresa: req.user.empresaId },
      { $inc: { contador: 1 } },
      { new: true }
    );

    await validarDisponibilidad({
      productos: cotizacion.productos,
      fechaInicio,
      fechaFin,
      empresaId: req.user.empresaId,
    });

    const subtotal = cotizacion.productos.reduce(
      (acc, item) => acc + (item.subtotal || 0),
      0
    );

    const totalPagar = cotizacion.total;

    const venta = await Venta.create({
      facturaHasConsecutivo,
      numeroConsecutivo: consecutivoActualizado?.contador ?? undefined,
      cliente: cotizacion.cliente,
      clienteTelefono: clienteTelefono || cotizacion.cliente?.telefono || '',
      clienteDireccion: clienteDireccion || cotizacion.cliente?.direccion || '',
      productos: cotizacion.productos,
      tipoDeServicio,
      duracionDelEvento,
      fechaDelEvento,
      fechaInicio,
      fechaFin,
      subtotal,
      descuento: descuento || 0,
      abono: abono || 0,
      totalPagar,
      empresa: req.user.empresaId,
    });

    const ventaCompleta = await Venta.findOne({
      _id: venta._id,
      empresa: req.user.empresaId,
    })
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate({
        path: 'facturaHasConsecutivo',
        populate: [
          { path: 'factura' },
          { path: 'consecutivo' },
        ],
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

module.exports = {
  getCotizaciones,
  getCotizacionById,
  createCotizacion,
  updateCotizacion,
  deleteCotizacion,
  convertirCotizacionAVenta,
};
