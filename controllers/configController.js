const Usuario = require('../models/usuarioModel');
const Empresa = require('../models/empresaModel');

const normalizarTexto = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const approxBase64Bytes = (b64) => {
  if (!b64) return 0;
  const clean = String(b64).replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
};

const parseDataUrl = (input) => {
  const raw = normalizarTexto(input);
  const match = raw.match(/^data:(image\/svg\+xml|image\/webp);base64,(.+)$/i);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const dataBase64 = match[2].replace(/\s/g, '');
  const format = mime === 'image/webp' ? 'webp' : 'svg';
  return { format, dataBase64 };
};

const validarYNormalizarLogo = ({ format, dataUrl, dataBase64 }) => {
  const formatTrim = normalizarTexto(format).toLowerCase();
  const parsed = dataUrl ? parseDataUrl(dataUrl) : null;
  const finalFormat = parsed?.format || formatTrim;
  const base64 = (parsed?.dataBase64 || dataBase64 || '').replace(/\s/g, '');

  if (!finalFormat || !['svg', 'webp'].includes(finalFormat)) {
    return { error: 'Formato inválido. Solo se permite SVG o WebP.' };
  }
  if (!base64) {
    return { error: 'Logo vacío. Adjunta un SVG o WebP válido.' };
  }

  const bytes = approxBase64Bytes(base64);
  const maxBytes = finalFormat === 'svg' ? 250 * 1024 : 500 * 1024;
  if (bytes > maxBytes) {
    return { error: `El logo excede el tamaño permitido (${Math.round(maxBytes / 1024)}KB).` };
  }

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { error: 'El contenido del logo no parece ser base64 válido.' };
  }

  if (finalFormat === 'svg') {
    let text = '';
    try {
      text = Buffer.from(base64, 'base64').toString('utf8');
    } catch {
      return { error: 'No se pudo decodificar el SVG.' };
    }
    if (!/<svg[\s>]/i.test(text)) {
      return { error: 'El SVG no contiene una etiqueta <svg> válida.' };
    }
    if (/<script[\s>]/i.test(text) || /\son\w+=/i.test(text)) {
      return { error: 'El SVG contiene contenido no permitido.' };
    }
    const normalizedBase64 = Buffer.from(text, 'utf8').toString('base64');
    return { value: { format: 'svg', dataBase64: normalizedBase64 } };
  }

  return { value: { format: 'webp', dataBase64: base64 } };
};

const getConfig = async (req, res) => {
  try {
    const [usuario, empresa] = await Promise.all([
      Usuario.findById(req.user._id).select('-password'),
      Empresa.findById(req.user.empresaId),
    ]);

    if (!usuario) {
      res.status(404);
      throw new Error('Usuario no encontrado');
    }
    if (!empresa) {
      res.status(404);
      throw new Error('Empresa no encontrada');
    }

    res.json({
      usuario: {
        _id: usuario._id,
        nombreUsuario: usuario.nombreUsuario,
        email: usuario.email || '',
        indicativo: usuario.indicativo || '+57',
        telefono: usuario.telefono || '',
        icono: usuario.icono || '',
        rol: usuario.rol,
        empresa: usuario.empresa,
      },
      empresa: {
        _id: empresa._id,
        nombre: empresa.nombre,
        nit: empresa.nit || '',
        direccion: empresa.direccion || '',
        telefono: empresa.telefono || '',
        email: empresa.email,
        logo: empresa.logo || { format: null, dataBase64: null, updatedAt: null },
        mostrarLogoEnComprobante: empresa.mostrarLogoEnComprobante === true,
      },
    });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const updateEmpresa = async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.user.empresaId);
    if (!empresa) {
      res.status(404);
      throw new Error('Empresa no encontrada');
    }

    if (req.body.nombre !== undefined) {
      const nombreTrim = normalizarTexto(req.body.nombre);
      if (!nombreTrim) {
        res.status(400);
        throw new Error('El nombre de la empresa es obligatorio');
      }
      if (nombreTrim.length > 150) {
        res.status(400);
        throw new Error('El nombre de la empresa no puede superar 150 caracteres');
      }
      const existente = await Empresa.findOne({
        nombre: new RegExp(`^${escapeRegex(nombreTrim)}$`, 'i'),
        _id: { $ne: empresa._id },
      }).select('_id');
      if (existente) {
        res.status(400);
        throw new Error('El nombre de empresa no está disponible');
      }
      empresa.nombre = nombreTrim;
    }

    if (req.body.nit !== undefined) {
      const nitTrim = normalizarTexto(req.body.nit);
      if (nitTrim.length > 20) {
        res.status(400);
        throw new Error('El NIT no puede superar 20 caracteres');
      }
      empresa.nit = nitTrim;
    }

    if (req.body.direccion !== undefined) {
      const direccionTrim = normalizarTexto(req.body.direccion);
      if (direccionTrim.length > 200) {
        res.status(400);
        throw new Error('La dirección no puede superar 200 caracteres');
      }
      empresa.direccion = direccionTrim;
    }

    if (req.body.telefono !== undefined) {
      const telefonoTrim = normalizarTexto(req.body.telefono);
      if (telefonoTrim.length > 15) {
        res.status(400);
        throw new Error('El teléfono no puede superar 15 caracteres');
      }
      empresa.telefono = telefonoTrim;
    }

    if (req.body.email !== undefined) {
      const emailTrim = normalizarTexto(req.body.email).toLowerCase();
      if (!emailTrim) {
        res.status(400);
        throw new Error('El correo de la empresa es obligatorio');
      }
      if (emailTrim.length > 254) {
        res.status(400);
        throw new Error('El correo no puede superar 254 caracteres');
      }
      if (!emailRegex.test(emailTrim)) {
        res.status(400);
        throw new Error('Correo electrónico inválido');
      }
      const existente = await Empresa.findOne({
        email: emailTrim,
        _id: { $ne: empresa._id },
      }).select('_id');
      if (existente) {
        res.status(400);
        throw new Error('El correo de la empresa ya está en uso');
      }
      empresa.email = emailTrim;
    }

    await empresa.save();

    res.json({
      _id: empresa._id,
      nombre: empresa.nombre,
      nit: empresa.nit || '',
      direccion: empresa.direccion || '',
      telefono: empresa.telefono || '',
      email: empresa.email,
      logo: empresa.logo || { format: null, dataBase64: null, updatedAt: null },
      mostrarLogoEnComprobante: empresa.mostrarLogoEnComprobante === true,
    });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const updateUsuarioMe = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.user._id);
    if (!usuario) {
      res.status(404);
      throw new Error('Usuario no encontrado');
    }

    if (req.body.email !== undefined) {
      const emailTrim = normalizarTexto(req.body.email).toLowerCase();
      const emailConfirmTrim = normalizarTexto(req.body.emailConfirm).toLowerCase();
      if ((emailTrim || emailConfirmTrim) && emailTrim !== emailConfirmTrim) {
        res.status(400);
        throw new Error('El correo y la confirmación de correo deben coincidir');
      }
      if (emailTrim && emailTrim.length > 254) {
        res.status(400);
        throw new Error('El correo no puede superar 254 caracteres');
      }
      if (emailTrim && !emailRegex.test(emailTrim)) {
        res.status(400);
        throw new Error('Correo electrónico inválido');
      }
      usuario.email = emailTrim || undefined;
    }

    if (req.body.indicativo !== undefined) {
      const indicativoTrim = normalizarTexto(req.body.indicativo) || '+57';
      if (indicativoTrim.length > 6) {
        res.status(400);
        throw new Error('El indicativo no puede superar 6 caracteres');
      }
      usuario.indicativo = indicativoTrim;
    }

    if (req.body.telefono !== undefined) {
      const telefonoTrim = normalizarTexto(req.body.telefono);
      if (telefonoTrim && telefonoTrim.length > 15) {
        res.status(400);
        throw new Error('El teléfono no puede superar 15 caracteres');
      }
      usuario.telefono = telefonoTrim || undefined;
    }

    if (req.body.icono !== undefined) {
      const iconoTrim = normalizarTexto(req.body.icono);
      if (iconoTrim.length > 30) {
        res.status(400);
        throw new Error('El ícono no puede superar 30 caracteres');
      }
      usuario.icono = iconoTrim;
    }

    await usuario.save();

    res.json({
      _id: usuario._id,
      nombreUsuario: usuario.nombreUsuario,
      email: usuario.email || '',
      indicativo: usuario.indicativo || '+57',
      telefono: usuario.telefono || '',
      icono: usuario.icono || '',
      rol: usuario.rol,
      empresa: usuario.empresa,
    });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

const updateEmpresaLogo = async (req, res) => {
  try {
    const empresa = await Empresa.findById(req.user.empresaId);
    if (!empresa) {
      res.status(404);
      throw new Error('Empresa no encontrada');
    }

    if (req.body.mostrarLogoEnComprobante !== undefined) {
      empresa.mostrarLogoEnComprobante = req.body.mostrarLogoEnComprobante === true;
    }

    const dataUrl = req.body.dataUrl;
    const dataBase64 = req.body.dataBase64;
    const format = req.body.format;

    if (dataUrl === null || dataBase64 === null) {
      empresa.logo = { format: null, dataBase64: null, updatedAt: new Date() };
      await empresa.save();
      return res.json({
        logo: empresa.logo,
        mostrarLogoEnComprobante: empresa.mostrarLogoEnComprobante === true,
      });
    }

    if (dataUrl !== undefined || dataBase64 !== undefined || format !== undefined) {
      const { error, value } = validarYNormalizarLogo({ format, dataUrl, dataBase64 });
      if (error) {
        res.status(400);
        throw new Error(error);
      }
      empresa.logo = {
        format: value.format,
        dataBase64: value.dataBase64,
        updatedAt: new Date(),
      };
    }

    await empresa.save();

    res.json({
      logo: empresa.logo,
      mostrarLogoEnComprobante: empresa.mostrarLogoEnComprobante === true,
    });
  } catch (error) {
    res.status(res.statusCode || 500).json({
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack,
    });
  }
};

module.exports = {
  getConfig,
  updateEmpresa,
  updateUsuarioMe,
  updateEmpresaLogo,
};

