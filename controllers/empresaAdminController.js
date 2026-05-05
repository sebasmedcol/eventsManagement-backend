const Empresa = require('../models/empresaModel');
const Usuario = require('../models/usuarioModel');

const getEmpresas = async (req, res) => {
  try {
    const empresas = await Empresa.find().sort({ fechaCreacion: -1 });
    res.json(empresas);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const getEstadisticas = async (req, res) => {
  try {
    const [totalEmpresas, pendientes, aprobadas, rechazadas, bloqueadas, totalUsuarios, usuariosPorRol] =
      await Promise.all([
        Empresa.countDocuments(),
        Empresa.countDocuments({ estadoAprobacion: 'pendiente' }),
        Empresa.countDocuments({ estadoAprobacion: 'aprobada' }),
        Empresa.countDocuments({ estadoAprobacion: 'rechazada' }),
        Empresa.countDocuments({ estado: false }),
        Usuario.countDocuments(),
        Usuario.aggregate([
          {
            $group: {
              _id: '$rol',
              total: { $sum: 1 },
            },
          },
        ]),
      ]);

    const usuariosPorRolMap = {};
    usuariosPorRol.forEach((item) => {
      usuariosPorRolMap[item._id || 'sin_rol'] = item.total;
    });

    res.json({
      totalEmpresas,
      pendientes,
      aprobadas,
      rechazadas,
      bloqueadas,
      totalUsuarios,
      usuariosPorRol: usuariosPorRolMap,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const getEmpresaUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find({ empresa: req.params.id }).select(
      '-password'
    );
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const actualizarEstadoEmpresa = async (req, res, nuevoEstado) => {
  try {
    const empresa = await Empresa.findById(req.params.id);

    if (!empresa) {
      res.status(404);
      throw new Error('Empresa no encontrada');
    }

    empresa.estadoAprobacion = nuevoEstado;
    empresa.estado = nuevoEstado === 'aprobada';

    if (nuevoEstado === 'aprobada') {
      empresa.solicitudToken = null;
      empresa.solicitudExpira = null;
    }

    await empresa.save();

    res.json(empresa);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const aprobarEmpresa = async (req, res) => {
  await actualizarEstadoEmpresa(req, res, 'aprobada');
};

const rechazarEmpresa = async (req, res) => {
  await actualizarEstadoEmpresa(req, res, 'rechazada');
};

const bloquearEmpresa = async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.id);

    if (!empresa) {
      res.status(404);
      throw new Error('Empresa no encontrada');
    }

    empresa.estado = false;
    await empresa.save();

    res.json(empresa);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const desbloquearEmpresa = async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.params.id);

    if (!empresa) {
      res.status(404);
      throw new Error('Empresa no encontrada');
    }

    empresa.estado = true;
    if (!empresa.estadoAprobacion) {
      empresa.estadoAprobacion = 'aprobada';
    }
    await empresa.save();

    res.json(empresa);
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getEmpresas,
  getEmpresaUsuarios,
  aprobarEmpresa,
  rechazarEmpresa,
  bloquearEmpresa,
  desbloquearEmpresa,
  getEstadisticas,
};
