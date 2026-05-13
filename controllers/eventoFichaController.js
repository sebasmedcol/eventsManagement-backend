const EventoFicha = require('../models/eventoFichaModel');
const EventoPremium = require('../models/eventoPremiumModel');
const Usuario = require('../models/usuarioModel');
const Producto = require('../models/productoModel');
const Venta = require('../models/ventaModel');

const populateFicha = [
  {
    path: 'evento',
    populate: [{ path: 'cliente', select: 'nombreCompleto telefono direccion' }],
  },
  { path: 'responsable', select: 'nombreUsuario rol' },
  {
    path: 'venta',
    select: '_id numeroConsecutivo facturaHasConsecutivo estado tipoDeServicio createdAt',
    populate: [
      {
        path: 'facturaHasConsecutivo',
        populate: [{ path: 'factura' }, { path: 'consecutivo' }],
      },
    ],
  },
  { path: 'productos.producto' },
];

const getFichaById = async (req, res) => {
  try {
    const ficha = await EventoFicha.findOne({
      _id: req.params.fichaId,
      empresa: req.user.empresaId,
    })
      .populate(populateFicha);

    if (!ficha) {
      res.status(404);
      throw new Error('Ficha no encontrada');
    }

    res.json(ficha);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const getFichasByEvento = async (req, res) => {
  try {
    const evento = await EventoPremium.findOne({
      _id: req.params.eventoId,
      empresa: req.user.empresaId,
    }).select('_id');

    if (!evento) {
      res.status(404);
      throw new Error('Evento no encontrado');
    }

    const fichas = await EventoFicha.find({
      empresa: req.user.empresaId,
      evento: req.params.eventoId,
    })
      .populate(populateFicha);

    res.json(fichas);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const createFicha = async (req, res) => {
  try {
    const { nombre, descripcion, color, responsable, tipoDeServicio, nota } = req.body || {};

    if (!nombre || !responsable || !tipoDeServicio) {
      res.status(400);
      throw new Error('Por favor ingrese nombre, responsable y tipoDeServicio');
    }

    const evento = await EventoPremium.findOne({
      _id: req.params.eventoId,
      empresa: req.user.empresaId,
    }).select('_id');
    if (!evento) {
      res.status(404);
      throw new Error('Evento no encontrado');
    }

    const responsableDoc = await Usuario.findOne({
      _id: responsable,
      empresa: req.user.empresaId,
    }).select('_id');
    if (!responsableDoc) {
      res.status(400);
      throw new Error('El responsable no pertenece a la empresa');
    }

    const tipo = String(tipoDeServicio).trim();
    const notaFinal = String(nota || '').trim();
    if (tipo === 'Notas' && notaFinal.length > 500) {
      res.status(400);
      throw new Error('La nota no puede superar 500 caracteres');
    }

    const ficha = await EventoFicha.create({
      empresa: req.user.empresaId,
      evento: req.params.eventoId,
      nombre: String(nombre).trim(),
      descripcion: String(descripcion || '').trim(),
      color: String(color || 'info').trim(),
      responsable,
      tipoDeServicio: tipo,
      nota: tipo === 'Notas' ? notaFinal : '',
      productos: [],
    });

    const completa = await EventoFicha.findById(ficha._id)
      .populate(populateFicha);

    res.status(201).json(completa);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const updateFicha = async (req, res) => {
  try {
    const ficha = await EventoFicha.findOne({
      _id: req.params.fichaId,
      empresa: req.user.empresaId,
    });
    if (!ficha) {
      res.status(404);
      throw new Error('Ficha no encontrada');
    }

    const body = req.body || {};
    if (body.nombre !== undefined) ficha.nombre = String(body.nombre).trim();
    if (body.descripcion !== undefined) ficha.descripcion = String(body.descripcion || '').trim();
    if (body.color !== undefined) ficha.color = String(body.color || 'info').trim();
    if (body.tipoDeServicio !== undefined) ficha.tipoDeServicio = String(body.tipoDeServicio).trim();

    if (body.responsable !== undefined) {
      const responsableDoc = await Usuario.findOne({
        _id: body.responsable,
        empresa: req.user.empresaId,
      }).select('_id');
      if (!responsableDoc) {
        res.status(400);
        throw new Error('El responsable no pertenece a la empresa');
      }
      if (String(ficha.responsable) !== String(body.responsable)) {
        ficha.notificacionLeidaPor = [];
      }
      ficha.responsable = body.responsable;
    }

    const tipo = ficha.tipoDeServicio;
    if (tipo === 'Notas') {
      const notaFinal = String(body.nota ?? ficha.nota ?? '').trim();
      if (notaFinal.length > 500) {
        res.status(400);
        throw new Error('La nota no puede superar 500 caracteres');
      }
      ficha.nota = notaFinal;
      ficha.productos = [];
    } else {
      ficha.nota = '';
    }

    await ficha.save();

    const completa = await EventoFicha.findById(ficha._id)
      .populate(populateFicha);

    res.json(completa);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const deleteFicha = async (req, res) => {
  try {
    const ficha = await EventoFicha.findOneAndDelete({
      _id: req.params.fichaId,
      empresa: req.user.empresaId,
    });
    if (!ficha) {
      res.status(404);
      throw new Error('Ficha no encontrada');
    }
    res.json({ message: 'Ficha eliminada' });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const addProductoToFicha = async (req, res) => {
  try {
    const ficha = await EventoFicha.findOne({
      _id: req.params.fichaId,
      empresa: req.user.empresaId,
    });
    if (!ficha) {
      res.status(404);
      throw new Error('Ficha no encontrada');
    }
    if (ficha.tipoDeServicio === 'Notas') {
      res.status(400);
      throw new Error('No se pueden agregar productos a una ficha de tipo Notas');
    }

    const { producto, cantidad, precioUnitario } = req.body || {};
    if (!producto || !cantidad) {
      res.status(400);
      throw new Error('Por favor ingrese producto y cantidad');
    }

    const productoDoc = await Producto.findOne({
      _id: producto,
      empresa: req.user.empresaId,
    });
    if (!productoDoc) {
      res.status(400);
      throw new Error('Producto no encontrado en la empresa');
    }

    const cantidadNum = Math.max(1, Number(cantidad) || 1);
    const precioNum =
      precioUnitario === undefined || precioUnitario === null || precioUnitario === ''
        ? Number(productoDoc.precio) || 0
        : Math.max(0, Number(precioUnitario) || 0);
    const subtotal = cantidadNum * precioNum;

    ficha.productos.push({
      producto,
      cantidad: cantidadNum,
      precioUnitario: precioNum,
      subtotal,
    });

    await ficha.save();

    const completa = await EventoFicha.findById(ficha._id)
      .populate(populateFicha);

    res.status(201).json(completa);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const updateProductoFicha = async (req, res) => {
  try {
    const ficha = await EventoFicha.findOne({
      _id: req.params.fichaId,
      empresa: req.user.empresaId,
    });
    if (!ficha) {
      res.status(404);
      throw new Error('Ficha no encontrada');
    }
    if (ficha.tipoDeServicio === 'Notas') {
      res.status(400);
      throw new Error('No se pueden editar productos en una ficha de tipo Notas');
    }

    const item = ficha.productos.id(req.params.itemId);
    if (!item) {
      res.status(404);
      throw new Error('Producto de ficha no encontrado');
    }

    const body = req.body || {};
    if (body.cantidad !== undefined) item.cantidad = Math.max(1, Number(body.cantidad) || 1);
    if (body.precioUnitario !== undefined)
      item.precioUnitario = Math.max(0, Number(body.precioUnitario) || 0);
    item.subtotal = (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0);

    await ficha.save();

    const completa = await EventoFicha.findById(ficha._id)
      .populate(populateFicha);

    res.json(completa);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const deleteProductoFicha = async (req, res) => {
  try {
    const ficha = await EventoFicha.findOne({
      _id: req.params.fichaId,
      empresa: req.user.empresaId,
    });
    if (!ficha) {
      res.status(404);
      throw new Error('Ficha no encontrada');
    }

    const item = ficha.productos.id(req.params.itemId);
    if (!item) {
      res.status(404);
      throw new Error('Producto de ficha no encontrado');
    }
    item.deleteOne();
    await ficha.save();

    const completa = await EventoFicha.findById(ficha._id)
      .populate(populateFicha);

    res.json(completa);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const linkVentaToFicha = async (req, res) => {
  try {
    const { ventaId } = req.body || {};
    if (!ventaId) {
      res.status(400);
      throw new Error('ventaId es requerido');
    }

    const ficha = await EventoFicha.findOne({
      _id: req.params.fichaId,
      empresa: req.user.empresaId,
    });
    if (!ficha) {
      res.status(404);
      throw new Error('Ficha no encontrada');
    }

    if (ficha.tipoDeServicio === 'Notas') {
      res.status(400);
      throw new Error('No se puede asociar una venta a una ficha de tipo Notas');
    }

    if (ficha.venta) {
      res.status(400);
      throw new Error('Esta ficha ya tiene una venta asociada');
    }

    const venta = await Venta.findOne({ _id: ventaId, empresa: req.user.empresaId }).select('_id');
    if (!venta) {
      res.status(400);
      throw new Error('Venta no encontrada en la empresa');
    }

    ficha.venta = ventaId;
    await ficha.save();

    const completa = await EventoFicha.findById(ficha._id)
      .populate(populateFicha);

    res.json(completa);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getFichaById,
  getFichasByEvento,
  createFicha,
  updateFicha,
  deleteFicha,
  addProductoToFicha,
  updateProductoFicha,
  deleteProductoFicha,
  linkVentaToFicha,
};
