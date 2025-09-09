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

// Cargar variables de entorno
dotenv.config();

// Crear usuario admin inicial
const { crearUsuarioAdmin } = require('./config/adminConfig');

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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
app.use('/api/auth', authRoutes);
app.use('/api/facturas', facturaRoutes);
app.use('/api/factura-consecutivo', facturaHasConsecutivoRoutes);

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
    
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT} en modo ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB:', error.message);
    process.exit(1);
  });
