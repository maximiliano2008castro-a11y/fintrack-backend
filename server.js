const express = require('express');
const cors = require('cors'); 
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');

const app = express();

// --- MIDDLEWARES ---s
app.use(cors()); // ✅ IMPORTANTE: Esto permite que React (puerto 3000) hable con Node (puerto 5000)
app.use(express.json()); // Permite procesar datos en formato JSON

// --- RUTAS ---
app.use('/api/auth', authRoutes);

// --- PUERTO ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 Servidor de FINTRACK YOUTH corriendo en el puerto ${PORT}`);
});