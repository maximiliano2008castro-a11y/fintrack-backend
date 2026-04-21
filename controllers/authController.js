const db = require('../config/db'); // Asegúrate de que esta ruta a tu archivo de conexión a la BD sea correcta
const bcrypt = require('bcrypt');

// ==========================================
// 1. FUNCIÓN PARA REGISTRAR USUARIO
// ==========================================
const registerUser = async (req, res) => {
    const { email, password } = req.body;
    
    // Validamos que lleguen los datos
    if (!email || !password) {
        return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        // Encriptamos la contraseña por seguridad
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insertamos en MySQL con los nombres EXACTOS de tus columnas.
        // ID se genera solo (AUTO_INCREMENT).
        // Nombre le ponemos uno por defecto para que MySQL no lo rechace si es NOT NULL.
        const [result] = await connection.query(
            'INSERT INTO usuarios (nombre, correo_electronico, hash_contrasena, pin_seguridad) VALUES (?, ?, ?, ?)',
            ['Usuario Nuevo', email, hashedPassword, '']
        );

        // Confirmamos la transacción
        await connection.commit();
        
        res.status(201).json({ message: 'Usuario registrado con éxito en MySQL' });
        
    } catch (error) {
        if (connection) await connection.rollback();
        
        console.error("❌ ERROR EXACTO EN MYSQL:", error.message);
        
        // Si el error es por correo duplicado (Código 1062 en MySQL)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "Este correo ya está registrado." });
        }

        res.status(500).json({ message: "Error de servidor: " + error.message });
    } finally {
        if (connection) connection.release();
    }
};

// ==========================================
// 2. FUNCIÓN PARA INICIAR SESIÓN
// ==========================================
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
    }

    try {
        // Buscamos al usuario por su correo
        const [users] = await db.query('SELECT * FROM usuarios WHERE correo_electronico = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: "El usuario no existe." });
        }

        const user = users[0];

        // Comparamos la contraseña encriptada
        const isMatch = await bcrypt.compare(password, user.hash_contrasena);
        
        if (!isMatch) {
            return res.status(401).json({ message: "Contraseña incorrecta." });
        }

        // Si todo está bien, mandamos éxito
        res.status(200).json({ 
            message: "Login exitoso",
            user: {
                id: user.id,
                nombre: user.nombre,
                email: user.correo_electronico
            }
        });

    } catch (error) {
        console.error("❌ ERROR EN LOGIN:", error.message);
        res.status(500).json({ message: "Error en el servidor al intentar iniciar sesión." });
    }
};

// ==========================================
// 🔴 LA SOLUCIÓN A TU ERROR (EXPORTAR LAS FUNCIONES)
// ==========================================
module.exports = { 
    registerUser, 
    loginUser 
};