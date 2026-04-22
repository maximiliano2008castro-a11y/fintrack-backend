const db = require('../config/db'); // Ruta a tu archivo de conexión
const bcrypt = require('bcrypt');

// ==========================================
// 1. FUNCIÓN PARA REGISTRAR USUARIO
// ==========================================
const registerUser = async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ message: "Correo y contraseña son obligatorios" });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await connection.query(
            'INSERT INTO usuarios (nombre, correo_electronico, hash_contrasena, pin_seguridad) VALUES (?, ?, ?, ?)',
            ['Usuario Nuevo', email, hashedPassword, '']
        );

        await connection.commit();
        res.status(201).json({ message: 'Usuario registrado con éxito en MySQL' });
        
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("❌ ERROR EXACTO EN MYSQL:", error.message);
        
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
        const [users] = await db.query('SELECT * FROM usuarios WHERE correo_electronico = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ message: "El usuario no existe." });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.hash_contrasena);
        
        if (!isMatch) {
            return res.status(401).json({ message: "Contraseña incorrecta." });
        }

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
// 🔴 3. NUEVA FUNCIÓN: ELIMINAR CUENTA (AUTODESTRUCCIÓN)
// ==========================================
const deleteUser = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Se requiere el correo para eliminar la cuenta." });
    }

    try {
        // Ejecutamos el DELETE usando el nombre de tu columna correo_electronico
        const [result] = await db.query('DELETE FROM usuarios WHERE correo_electronico = ?', [email]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "El usuario no se encontró en la nube." });
        }

        console.log(`🗑️ Cuenta de TiDB eliminada: ${email}`);
        res.status(200).json({ message: "Cuenta eliminada correctamente de la base de datos." });

    } catch (error) {
        console.error("❌ ERROR AL ELIMINAR EN TIDB:", error.message);
        res.status(500).json({ message: "Error interno al intentar borrar la cuenta del servidor." });
    }
};

// ==========================================
// EXPORTAR TODAS LAS FUNCIONES (INCLUYENDO ELIMINAR)
// ==========================================
module.exports = { 
    registerUser, 
    loginUser,
    deleteUser 
};