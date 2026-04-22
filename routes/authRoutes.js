const express = require('express');
const router = express.Router();
const { registerUser, loginUser, deleteUser, saveFinancialData, getFinancialData } = require('../controllers/authController');

// Rutas Básicas
router.post('/register', registerUser);
router.post('/login', loginUser);
router.delete('/delete', deleteUser);

// ☁️ Rutas de Sincronización con TiDB
router.post('/save-data', saveFinancialData);
router.get('/get-data/:email', getFinancialData);

module.exports = router;