const express = require('express');
const mongoose = require('mongoose');

const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Importar middlewares
const errorHandler = require('./middlewares/errorMiddleware');

// Importar rutas
const clienteRoutes = require('./routes/clienteRoutes');
const consecutivoRoutes = require('./routes/consecutivoRoutes');
const productoRoutes = require('./routes/productoRoutes');
const ventaRoutes = require('./routes/ventaRoutes');
const authRoutes = require('./routes/authRoutes');
const facturaRoutes = require('./routes/facturaRoutes');
const facturaHasConsecutivoRoutes = require('./routes/facturaHasConsecutivoRoutes');
const eventoRoutes = require('./routes/eventoRoutes');
const eventoPremiumRoutes = require('./routes/eventoPremiumRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const cotizacionRoutes = require('./routes/cotizacionRoutes');
const empresaAdminRoutes = require('./routes/empresaAdminRoutes');
const rolRoutes = require('./routes/rolRoutes');
const configRoutes = require('./routes/configRoutes');
const planRoutes = require('./routes/planRoutes');

// Cargar variables de entorno
dotenv.config();

// Crear usuarios iniciales (admin de tenant y superadmin)
const { crearUsuarioAdmin, crearUsuarioSuperAdmin } = require('./config/adminConfig');

// Inicializar Express
const app = express();

// Middlewares
const allowedOrigins = [
  'http://localhost:5173',                // desarrollo local con Vite
  'https://ianmanagement.web.app',        // dominio Firebase Hosting
  'https://ianmanagement.firebaseapp.com' // alias Firebase
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS bloqueado para este origen: ' + origin));
  }
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// Ruta de prueba para verificar que la API esté viva
app.get('/health', (_, res) => {
  res.send('OK');
});

// Rutas API
app.use('/api/clientes', clienteRoutes);
app.use('/api/consecutivos', consecutivoRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/eventos', eventoRoutes);
app.use('/api/eventos-premium', eventoPremiumRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/factura-consecutivo', facturaHasConsecutivoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/cotizaciones', cotizacionRoutes);
app.use('/api/empresas-admin', empresaAdminRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/config', configRoutes);
app.use('/api/config', planRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Conectar a MongoDB y arrancar servidor
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Conexión a MongoDB establecida');
    
    // Crear usuario admin inicial si no existe
    crearUsuarioAdmin();
    crearUsuarioSuperAdmin();
    
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT} en modo ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB:', error.message);
    process.exit(1);
  });
