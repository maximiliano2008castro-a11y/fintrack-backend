const express = require('express');
const router = express.Router();
// 🔴 IMPORTAMOS LA NUEVA FUNCIÓN deleteUser
const { registerUser, loginUser, deleteUser } = require('../controllers/authController');

// Ruta para registro: /api/auth/register
router.post('/register', registerUser);

// Ruta para login: /api/auth/login
router.post('/login', loginUser); 

// 🔴 RUTA PARA ELIMINAR CUENTA: /api/auth/delete
router.delete('/delete', deleteUser);

module.exports = router;