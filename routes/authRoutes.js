const express = require('express');
const router = express.Router();
const { registerUser, loginUser, deleteUser, saveFinancialData, getFinancialData } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

// --- Rutas publicas (no requieren sesion) ---
router.post('/register', registerUser);
router.post('/login', loginUser);

// --- Rutas protegidas: exigen token valido ---
// El correo del usuario se saca del token, por eso get-data ya no lleva :email
router.get('/get-data', verificarToken, getFinancialData);
router.post('/save-data', verificarToken, saveFinancialData);
router.delete('/delete', verificarToken, deleteUser);

module.exports = router;
