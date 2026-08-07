const express = require('express');
const cors = require('cors'); 
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');

const app = express();

// --- MIDDLEWARES ---
// Solo estos origenes pueden llamar a la API. Antes estaba abierto a cualquier sitio web.
// Para agregar otro dominio, ponlo en ORIGENES_PERMITIDOS separado por comas en el .env
const origenesPermitidos = (process.env.ORIGENES_PERMITIDOS ||
    'http://localhost:3000,https://fintrack-frontend-wev7.onrender.com'
).split(',').map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        // Sin origin = apps moviles, Postman o peticiones del mismo servidor
        if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
        callback(new Error('Origen no permitido por CORS'));
    }
}));

app.use(express.json()); // Permite procesar datos en formato JSON

// --- RUTAS ---
app.use('/api/auth', authRoutes);

// --- PUERTO ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor de FINTRACK YOUTH corriendo en el puerto ${PORT}`);
});