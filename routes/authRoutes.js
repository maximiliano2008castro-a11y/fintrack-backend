const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// Ruta para registro: /api/auth/register
router.post('/register', registerUser);

// Ruta para login: /api/auth/login
router.post('/login', loginUser); // <--- ¡ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ AQUÍ!

module.exports = router;