const Venta = require('../models/ventaModel');
const Consecutivo = require('../models/consecutivoModel');
const FacturaHasConsecutivo = require('../models/facturaHasConsecutivoModel');
const { validarDisponibilidad } = require('../services/inventarioService');

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isNaN(n) ? fallback : n;
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const formatDuration = (minutes) => {
  const total = Math.max(0, Math.floor(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const calcularIvaTotales = ({ subtotal, descuento, ivaPorcentaje, abono }) => {
  const subtotalNum = Math.max(0, toNumber(subtotal, 0));
  const descuentoNum = Math.max(0, toNumber(descuento, 0));
  const abonoNum = Math.max(0, toNumber(abono, 0));
  const ivaPct = Math.min(100, Math.max(0, toNumber(ivaPorcentaje, 0)));

  const baseGravable = Math.max(0, subtotalNum - descuentoNum);
  const ivaValor = round2(baseGravable * (ivaPct / 100));
  const totalPagar = round2(baseGravable + ivaValor);
  const saldoPendiente = round2(Math.max(0, totalPagar - abonoNum));

  return {
    subtotal: subtotalNum,
    descuento: descuentoNum,
    abono: abonoNum,
    ivaPorcentaje: ivaPct,
    ivaValor,
    totalPagar,
    saldoPendiente,
  };
};

const calcularFechasAlquiler = ({ eventoInicio, eventoFin, loadInInicio, loadOutFin, soloCobrarTiempoEvento }) => {
  const eventoInicioDate = parseDateOrNull(eventoInicio);
  const eventoFinDate = parseDateOrNull(eventoFin);
  const loadInInicioDate = parseDateOrNull(loadInInicio);
  const loadOutFinDate = parseDateOrNull(loadOutFin);

  if (!eventoInicioDate || !eventoFinDate) {
    return { error: 'Debe ingresar fecha y hora de inicio y fin del evento' };
  }
  if (!loadInInicioDate || !loadOutFinDate) {
    return { error: 'Debe ingresar fecha y hora de inicio de load-in y fin de load-out' };
  }

  if (loadInInicioDate > eventoInicioDate) {
    return { error: 'load-in no puede iniciar después del inicio del evento' };
  }
  if (eventoInicioDate > eventoFinDate) {
    return { error: 'La fecha/hora de inicio del evento no puede ser mayor que la de fin' };
  }
  if (eventoFinDate > loadOutFinDate) {
    return { error: 'load-out no puede finalizar antes del fin del evento' };
  }

  const fechaInicio = loadInInicioDate;
  const fechaFin = loadOutFinDate;

  const rangoCobroInicio = soloCobrarTiempoEvento ? eventoInicioDate : loadInInicioDate;
  const rangoCobroFin = soloCobrarTiempoEvento ? eventoFinDate : loadOutFinDate;
  const duracionMin = Math.round((rangoCobroFin.getTime() - rangoCobroInicio.getTime()) / 60000);

  return {
    eventoInicioDate,
    eventoFinDate,
    loadInInicioDate,
    loadOutFinDate,
    fechaInicio,
    fechaFin,
    fechaDelEvento: new Date(eventoInicioDate.getFullYear(), eventoInicioDate.getMonth(), eventoInicioDate.getDate()),
    duracionDelEvento: formatDuration(duracionMin),
  };
};

/**
 * @desc    Obtener todas las ventas
 * @route   GET /api/ventas
 * @access  Privado
 */
const getVentas = async (req, res) => {
  try {
    const ventas = await Venta.find({ empresa: req.user.empresaId })
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
    const venta = await Venta.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
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
      eventoInicio,
      eventoFin,
      soloCobrarTiempoEvento,
      loadInInicio,
      loadOutFin,
      subtotal,
      descuento,
      abono,
      clienteTelefono,
      clienteDireccion,
      ivaPorcentaje,
    } = req.body;

    // Validar datos de entrada
    if (!cliente || !Array.isArray(productos) || productos.length === 0 || !tipoDeServicio) {
      res.status(400);
      throw new Error('Por favor ingrese todos los campos requeridos');
    }

    const { facturaHasConsecutivo } = req.body;
    if (!facturaHasConsecutivo) {
      res.status(400);
      throw new Error('Por favor seleccione una factura con consecutivo');
    }

    const relacion = await FacturaHasConsecutivo.findOne({
      _id: facturaHasConsecutivo,
      empresa: req.user.empresaId,
    })
      .populate('consecutivo');

    if (!relacion) {
      res.status(400);
      throw new Error('La relación factura-consecutivo no existe');
    }

    await relacion.populate('factura');
    
    const consecutivoActualizado = await Consecutivo.findOneAndUpdate(
      { _id: relacion.consecutivo._id, empresa: req.user.empresaId },
      { $inc: { contador: 1 } },
      { new: true }
    );

    let fechaInicioFinal;
    let fechaFinFinal;
    let fechaDelEventoFinal = null;
    let duracionDelEventoFinal = '';
    let eventoInicioFinal = null;
    let eventoFinFinal = null;
    let loadInInicioFinal = null;
    let loadOutFinFinal = null;
    let soloCobrarTiempoEventoFinal = !!soloCobrarTiempoEvento;

    if (tipoDeServicio === 'Alquiler') {
      const calc = calcularFechasAlquiler({
        eventoInicio,
        eventoFin,
        loadInInicio,
        loadOutFin,
        soloCobrarTiempoEvento: soloCobrarTiempoEventoFinal,
      });
      if (calc.error) {
        res.status(400);
        throw new Error(calc.error);
      }
      fechaInicioFinal = calc.fechaInicio;
      fechaFinFinal = calc.fechaFin;
      fechaDelEventoFinal = calc.fechaDelEvento;
      duracionDelEventoFinal = calc.duracionDelEvento;
      eventoInicioFinal = calc.eventoInicioDate;
      eventoFinFinal = calc.eventoFinDate;
      loadInInicioFinal = calc.loadInInicioDate;
      loadOutFinFinal = calc.loadOutFinDate;
    } else if (tipoDeServicio === 'Venta') {
      const now = new Date();
      fechaInicioFinal = now;
      fechaFinFinal = now;
      soloCobrarTiempoEventoFinal = false;
    } else {
      res.status(400);
      throw new Error('Tipo de servicio inválido');
    }

    await validarDisponibilidad({
      productos,
      fechaInicio: fechaInicioFinal,
      fechaFin: fechaFinFinal,
      empresaId: req.user.empresaId,
    });

    const ivaPorcentajeFinal =
      ivaPorcentaje === undefined || ivaPorcentaje === null || ivaPorcentaje === ''
        ? relacion.factura?.ivaPorcentaje ?? 0
        : Number(ivaPorcentaje);

    const totales = calcularIvaTotales({
      subtotal,
      descuento,
      ivaPorcentaje: ivaPorcentajeFinal,
      abono,
    });

    const venta = await Venta.create({
      facturaHasConsecutivo,
      numeroConsecutivo: consecutivoActualizado?.contador ?? undefined,
      cliente,
      clienteTelefono,
      clienteDireccion,
      productos,
      tipoDeServicio,
      duracionDelEvento: duracionDelEventoFinal,
      fechaDelEvento: fechaDelEventoFinal,
      eventoInicio: eventoInicioFinal,
      eventoFin: eventoFinFinal,
      soloCobrarTiempoEvento: soloCobrarTiempoEventoFinal,
      loadInInicio: loadInInicioFinal,
      loadOutFin: loadOutFinFinal,
      fechaInicio: fechaInicioFinal,
      fechaFin: fechaFinFinal,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      ivaPorcentaje: totales.ivaPorcentaje,
      ivaValor: totales.ivaValor,
      abono: totales.abono,
      totalPagar: totales.totalPagar,
      saldoPendiente: totales.saldoPendiente,
      empresa: req.user.empresaId,
    });

    // Poblar la venta con los datos relacionados
    const ventaCompleta = await Venta.findOne({
      _id: venta._id,
      empresa: req.user.empresaId,
    })
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
    const venta = await Venta.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!venta) {
      res.status(404);
      throw new Error('Venta no encontrada');
    }

    const body = req.body || {};

    const tipoDeServicio = body.tipoDeServicio ?? venta.tipoDeServicio;
    const productos = Array.isArray(body.productos) ? body.productos : venta.productos;

    let fechaInicioFinal = venta.fechaInicio;
    let fechaFinFinal = venta.fechaFin;
    let fechaDelEventoFinal = venta.fechaDelEvento ?? null;
    let duracionDelEventoFinal = venta.duracionDelEvento ?? '';
    let eventoInicioFinal = venta.eventoInicio ?? null;
    let eventoFinFinal = venta.eventoFin ?? null;
    let loadInInicioFinal = venta.loadInInicio ?? null;
    let loadOutFinFinal = venta.loadOutFin ?? null;
    let soloCobrarTiempoEventoFinal =
      body.soloCobrarTiempoEvento !== undefined
        ? !!body.soloCobrarTiempoEvento
        : !!venta.soloCobrarTiempoEvento;

    if (tipoDeServicio === 'Alquiler') {
      const calc = calcularFechasAlquiler({
        eventoInicio: body.eventoInicio ?? venta.eventoInicio,
        eventoFin: body.eventoFin ?? venta.eventoFin,
        loadInInicio: body.loadInInicio ?? venta.loadInInicio,
        loadOutFin: body.loadOutFin ?? venta.loadOutFin,
        soloCobrarTiempoEvento: soloCobrarTiempoEventoFinal,
      });
      if (calc.error) {
        res.status(400);
        throw new Error(calc.error);
      }
      fechaInicioFinal = calc.fechaInicio;
      fechaFinFinal = calc.fechaFin;
      fechaDelEventoFinal = calc.fechaDelEvento;
      duracionDelEventoFinal = calc.duracionDelEvento;
      eventoInicioFinal = calc.eventoInicioDate;
      eventoFinFinal = calc.eventoFinDate;
      loadInInicioFinal = calc.loadInInicioDate;
      loadOutFinFinal = calc.loadOutFinDate;
    } else if (tipoDeServicio === 'Venta') {
      const base = venta.fecha || new Date();
      fechaInicioFinal = base;
      fechaFinFinal = base;
      fechaDelEventoFinal = null;
      duracionDelEventoFinal = '';
      eventoInicioFinal = null;
      eventoFinFinal = null;
      loadInInicioFinal = null;
      loadOutFinFinal = null;
      soloCobrarTiempoEventoFinal = false;
    } else {
      res.status(400);
      throw new Error('Tipo de servicio inválido');
    }

    await validarDisponibilidad({
      productos,
      fechaInicio: fechaInicioFinal,
      fechaFin: fechaFinFinal,
      empresaId: req.user.empresaId,
      excluirVentaId: venta._id,
    });

    const relacion = body.facturaHasConsecutivo
      ? await FacturaHasConsecutivo.findOne({
          _id: body.facturaHasConsecutivo,
          empresa: req.user.empresaId,
        }).populate('factura')
      : null;

    const ivaPorcentajeFinal =
      body.ivaPorcentaje === undefined || body.ivaPorcentaje === null || body.ivaPorcentaje === ''
        ? relacion?.factura?.ivaPorcentaje ?? venta.ivaPorcentaje ?? 0
        : Number(body.ivaPorcentaje);

    const totales = calcularIvaTotales({
      subtotal: body.subtotal ?? venta.subtotal,
      descuento: body.descuento ?? venta.descuento,
      ivaPorcentaje: ivaPorcentajeFinal,
      abono: body.abono ?? venta.abono,
    });

    let estadoFinal = body.estado;
    if (estadoFinal === true || estadoFinal === 'true') estadoFinal = 'activa';
    if (estadoFinal === false || estadoFinal === 'false') estadoFinal = 'cancelada';

    const payload = {
      ...body,
      tipoDeServicio,
      duracionDelEvento: duracionDelEventoFinal,
      fechaDelEvento: fechaDelEventoFinal,
      eventoInicio: eventoInicioFinal,
      eventoFin: eventoFinFinal,
      soloCobrarTiempoEvento: soloCobrarTiempoEventoFinal,
      loadInInicio: loadInInicioFinal,
      loadOutFin: loadOutFinFinal,
      fechaInicio: fechaInicioFinal,
      fechaFin: fechaFinFinal,
      subtotal: totales.subtotal,
      descuento: totales.descuento,
      ivaPorcentaje: totales.ivaPorcentaje,
      ivaValor: totales.ivaValor,
      abono: totales.abono,
      totalPagar: totales.totalPagar,
      saldoPendiente: totales.saldoPendiente,
      estado: estadoFinal,
    };

    const ventaActualizada = await Venta.findOneAndUpdate(
      { _id: req.params.id, empresa: req.user.empresaId },
      payload,
      { new: true }
    )
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
    const venta = await Venta.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!venta) {
      res.status(404);
      throw new Error('Venta no encontrada');
    }

    venta.estado = 'cancelada';
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
