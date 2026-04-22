const db = require('../config/db'); 
const bcrypt = require('bcrypt');

// ==========================================
// 1. REGISTRAR USUARIO
// ==========================================
const registerUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Correo y contraseña son obligatorios" });

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await connection.query(
            'INSERT INTO usuarios (nombre, correo_electronico, hash_contrasena, pin_seguridad) VALUES (?, ?, ?, ?)',
            ['Usuario Nuevo', email, hashedPassword, '']
        );

        await connection.commit();
        res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
        if (connection) await connection.rollback();
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: "Este correo ya está registrado." });
        res.status(500).json({ message: "Error de servidor: " + error.message });
    } finally {
        if (connection) connection.release();
    }
};

// ==========================================
// 2. INICIAR SESIÓN
// ==========================================
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Correo y contraseña son obligatorios" });

    try {
        const [users] = await db.query('SELECT * FROM usuarios WHERE correo_electronico = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: "El usuario no existe." });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.hash_contrasena);
        
        if (!isMatch) return res.status(401).json({ message: "Contraseña incorrecta." });

        res.status(200).json({ message: "Login exitoso", user: { id: user.id, nombre: user.nombre, email: user.correo_electronico } });
    } catch (error) {
        res.status(500).json({ message: "Error al intentar iniciar sesión." });
    }
};

// ==========================================
// 3. ELIMINAR CUENTA
// ==========================================
const deleteUser = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Se requiere el correo." });

    try {
        const [result] = await db.query('DELETE FROM usuarios WHERE correo_electronico = ?', [email]);
        if (result.affectedRows === 0) return res.status(404).json({ message: "El usuario no se encontró." });
        res.status(200).json({ message: "Cuenta eliminada correctamente." });
    } catch (error) {
        res.status(500).json({ message: "Error al borrar la cuenta." });
    }
};

// ==========================================
// ☁️ 4. GUARDAR DATOS EN LA NUBE
// ==========================================
const saveFinancialData = async (req, res) => {
    const { email, financialData } = req.body;
    try {
        // Guardamos el objeto convirtiéndolo a string por seguridad
        await db.query(
            'UPDATE usuarios SET datos_financieros = ?, isConfigured = TRUE WHERE correo_electronico = ?',
            [JSON.stringify(financialData), email]
        );
        res.status(200).json({ message: "Datos guardados en TiDB" });
    } catch (error) {
        console.error("Error guardando en BD:", error);
        res.status(500).json({ message: "Error al guardar en la nube" });
    }
};

// ==========================================
// ☁️ 5. OBTENER DATOS DE LA NUBE (ARREGLADO 🛠️)
// ==========================================
const getFinancialData = async (req, res) => {
    const { email } = req.params;
    try {
        const [users] = await db.query(
            'SELECT datos_financieros, isConfigured FROM usuarios WHERE correo_electronico = ?',
            [email]
        );
        
        if (users.length > 0) {
            const row = users[0];
            let finalData;

            // 🚨 EL FIX MAESTRO ESTÁ AQUÍ 🚨
            // Revisamos si lo que viene de la BD es texto o ya es un objeto
            if (typeof row.datos_financieros === 'string') {
                try {
                    finalData = JSON.parse(row.datos_financieros);
                } catch (e) {
                    finalData = {}; // Fallback si el JSON está mal
                }
            } else {
                // Si TiDB ya lo entrega como objeto, lo usamos directo
                finalData = row.datos_financieros || {};
            }

            res.status(200).json({
                financialData: finalData,
                isConfigured: row.isConfigured === 1 || row.isConfigured === true
            });
        } else {
            res.status(404).json({ message: "Usuario no encontrado" });
        }
    } catch (error) {
        console.error("Error leyendo BD:", error);
        res.status(500).json({ message: "Error al leer de la nube" });
    }
};

module.exports = { registerUser, loginUser, deleteUser, saveFinancialData, getFinancialData };