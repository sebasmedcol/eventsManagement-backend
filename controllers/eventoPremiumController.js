const EventoPremium = require('../models/eventoPremiumModel');
const Usuario = require('../models/usuarioModel');
const EventoFicha = require('../models/eventoFichaModel');

const getEventosPremium = async (req, res) => {
  try {
    const eventos = await EventoPremium.find({ empresa: req.user.empresaId })
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('responsable', 'nombreUsuario rol')
      .sort({ fechaDelEvento: -1 });
    res.json(eventos);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const getEventoPremiumById = async (req, res) => {
  try {
    const evento = await EventoPremium.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    })
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('responsable', 'nombreUsuario rol');

    if (!evento) {
      res.status(404);
      throw new Error('Evento no encontrado');
    }
    res.json(evento);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const createEventoPremium = async (req, res) => {
  try {
    const { nombre, cliente, fechaDelEvento, responsable } = req.body || {};

    if (!nombre || !cliente || !fechaDelEvento || !responsable) {
      res.status(400);
      throw new Error('Por favor ingrese nombre, cliente, fechaDelEvento y responsable');
    }

    const responsableDoc = await Usuario.findOne({
      _id: responsable,
      empresa: req.user.empresaId,
    }).select('_id');
    if (!responsableDoc) {
      res.status(400);
      throw new Error('El responsable no pertenece a la empresa');
    }

    const evento = await EventoPremium.create({
      empresa: req.user.empresaId,
      nombre: String(nombre).trim(),
      cliente,
      tipoDeServicio: 'Evento',
      fechaDelEvento,
      responsable,
      estado: true,
    });

    const completo = await EventoPremium.findById(evento._id)
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('responsable', 'nombreUsuario rol');

    res.status(201).json(completo);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const updateEventoPremium = async (req, res) => {
  try {
    const evento = await EventoPremium.findOne({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!evento) {
      res.status(404);
      throw new Error('Evento no encontrado');
    }

    const body = req.body || {};
    if (body.nombre !== undefined) evento.nombre = String(body.nombre).trim();
    if (body.cliente !== undefined) evento.cliente = body.cliente;
    if (body.fechaDelEvento !== undefined) evento.fechaDelEvento = body.fechaDelEvento;
    if (body.estado !== undefined) evento.estado = !!body.estado;

    if (body.responsable !== undefined) {
      const responsableDoc = await Usuario.findOne({
        _id: body.responsable,
        empresa: req.user.empresaId,
      }).select('_id');
      if (!responsableDoc) {
        res.status(400);
        throw new Error('El responsable no pertenece a la empresa');
      }
      evento.responsable = body.responsable;
    }

    await evento.save();

    const completo = await EventoPremium.findById(evento._id)
      .populate('cliente', 'nombreCompleto telefono direccion')
      .populate('responsable', 'nombreUsuario rol');

    res.json(completo);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const deleteEventoPremium = async (req, res) => {
  try {
    const evento = await EventoPremium.findOneAndDelete({
      _id: req.params.id,
      empresa: req.user.empresaId,
    });

    if (!evento) {
      res.status(404);
      throw new Error('Evento no encontrado');
    }

    res.json({ message: 'Evento eliminado' });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getUsuariosEmpresaPremiumEventos: async (req, res) => {
    try {
      const usuarios = await Usuario.find({ empresa: req.user.empresaId })
        .select('_id nombreUsuario rol estado');
      res.json(usuarios);
    } catch (error) {
      res.status(500).json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? null : error.stack,
      });
    }
  },
  getNotificacionesEventosPremium: async (req, res) => {
    try {
      const fichas = await EventoFicha.find({
        empresa: req.user.empresaId,
        responsable: req.user._id,
      })
        .populate({
          path: 'evento',
          select: 'nombre fechaDelEvento cliente',
          populate: [{ path: 'cliente', select: 'nombreCompleto' }],
        })
        .select('_id nombre tipoDeServicio evento createdAt updatedAt venta');

      const data = (Array.isArray(fichas) ? fichas : [])
        .filter((f) => !!f.evento)
        .map((f) => ({
          _id: f._id,
          fichaId: f._id,
          fichaNombre: f.nombre,
          fichaTipoDeServicio: f.tipoDeServicio,
          eventoId: f.evento?._id,
          eventoNombre: f.evento?.nombre || '',
          fechaDelEvento: f.evento?.fechaDelEvento || null,
          clienteNombre: f.evento?.cliente?.nombreCompleto || '',
          hasVenta: !!f.venta,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        }));

      res.json(data);
    } catch (error) {
      res.status(500).json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? null : error.stack,
      });
    }
  },
  getEventosPremium,
  getEventoPremiumById,
  createEventoPremium,
  updateEventoPremium,
  deleteEventoPremium,
};
