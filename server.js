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

// Ruta de salud, util para saber si el servidor esta vivo sin tocar la base de datos.
app.get('/api/health', (req, res) => res.json({ ok: true, hora: new Date().toISOString() }));

// --- ARRANQUE ---
// En Render (y en local) este archivo se ejecuta directo y hay que escuchar un puerto.
// En Vercel NO: ahi la app se importa desde api/index.js y la plataforma la invoca sola.
// Por eso solo llamamos a listen() cuando el archivo se corre como programa principal.
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Servidor de FINTRACK corriendo en el puerto ${PORT}`);
    });
}

module.exports = app;