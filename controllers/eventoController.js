const Venta = require('../models/ventaModel');

/**
 * @desc    Listar eventos (derivados de ventas con fechaDelEvento y estado=true)
 * @route   GET /api/eventos
 * @access  Privado
 */
const getEventos = async (req, res) => {
  try {
    const { from, to } = req.query;

    const filter = {
      fechaDelEvento: { $ne: null },
      estado: true,
    };

    if (from || to) {
      const range = {};
      if (from) range.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        // Incluir todo el día 'to' hasta 23:59:59.999
        toDate.setHours(23, 59, 59, 999);
        range.$lte = toDate;
      }
      filter.fechaDelEvento = range;
    }

    const ventas = await Venta.find(filter)
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('productos.producto')
      .sort({ fechaDelEvento: 1 });

    if (!ventas || ventas.length === 0) {
      return res.status(404).json({ message: 'No hay eventos registrados.' });
    }

    // Formato de respuesta orientado a calendario (pero conservando venta completa)
    const eventos = ventas.map((v) => ({
      _id: v._id,
      title: `${v.cliente?.nombreCompleto || 'Sin cliente'} - ${v.tipoDeServicio}`,
      start: v.fechaDelEvento,
      end: v.fechaDelEvento,
      estado: v.estado,
      tipoDeServicio: v.tipoDeServicio,
      venta: v,
    }));

    res.json(eventos);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

/**
 * @desc    Obtener detalle de un evento por ID (corresponde al ID de la venta)
 * @route   GET /api/eventos/:id
 * @access  Privado
 */
const getEventoById = async (req, res) => {
  try {
    const venta = await Venta.findOne({ _id: req.params.id })
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
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    if (!venta.fechaDelEvento) {
      return res.status(400).json({ message: 'La venta no tiene fecha de evento asignada' });
    }

    if (!venta.estado) {
      return res.status(404).json({ message: 'El evento está cancelado y no se muestra' });
    }

    res.json({
      _id: venta._id,
      title: `${venta.cliente?.nombreCompleto || 'Sin cliente'} - ${venta.tipoDeServicio}`,
      start: venta.fechaDelEvento,
      end: venta.fechaDelEvento,
      estado: venta.estado,
      tipoDeServicio: venta.tipoDeServicio,
      venta,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = { getEventos, getEventoById };