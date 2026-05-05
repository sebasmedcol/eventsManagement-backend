const Venta = require('../models/ventaModel');
const Producto = require('../models/productoModel');
const mongoose = require('mongoose');

const validarDisponibilidad = async ({
  productos,
  fechaInicio,
  fechaFin,
  empresaId,
  excluirVentaId,
}) => {
  if (!Array.isArray(productos) || productos.length === 0) {
    return;
  }

  if (!fechaInicio || !fechaFin) {
    throw new Error('Se requieren fechaInicio y fechaFin para validar disponibilidad');
  }

  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    throw new Error('Las fechas proporcionadas no son válidas');
  }

  if (inicio > fin) {
    throw new Error('fechaInicio no puede ser mayor que fechaFin');
  }

  const ventaObjectId =
    excluirVentaId && mongoose.isValidObjectId(excluirVentaId)
      ? new mongoose.Types.ObjectId(excluirVentaId)
      : null;

  for (const item of productos) {
    const productoId = item.producto;
    const cantidadSolicitada = item.cantidad;

    if (!productoId || !cantidadSolicitada || cantidadSolicitada <= 0) {
      throw new Error('Cada producto debe incluir producto y cantidad mayor a 0');
    }

    const producto = await Producto.findOne({
      _id: productoId,
      empresa: empresaId,
    });

    if (!producto) {
      throw new Error('Producto no encontrado en la empresa actual');
    }

    if (producto.cantidadTotal == null || producto.cantidadTotal < 0) {
      throw new Error('El producto no tiene cantidadTotal configurada');
    }

    const resultado = await Venta.aggregate([
      {
        $match: {
          empresa: producto.empresa,
          estado: 'activa',
          ...(ventaObjectId ? { _id: { $ne: ventaObjectId } } : {}),
          fechaInicio: { $lte: fin },
          fechaFin: { $gte: inicio },
        },
      },
      { $unwind: '$productos' },
      {
        $match: {
          'productos.producto': producto._id,
        },
      },
      {
        $group: {
          _id: '$productos.producto',
          totalReservado: { $sum: '$productos.cantidad' },
        },
      },
    ]);

    const totalReservado = resultado.length > 0 ? resultado[0].totalReservado : 0;

    if (totalReservado + cantidadSolicitada > producto.cantidadTotal) {
      throw new Error(
        `No hay disponibilidad suficiente para el producto ${producto.nombre}. Reservado: ${totalReservado}, solicitado: ${cantidadSolicitada}, total: ${producto.cantidadTotal}`
      );
    }
  }
};

module.exports = {
  validarDisponibilidad,
};
