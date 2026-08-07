const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Falla de inmediato si falta el secreto, en vez de firmar tokens inseguros.
if (!process.env.JWT_SECRET) {
    throw new Error('Falta la variable JWT_SECRET. Agregala al .env y a Render antes de arrancar.');
}

const generarToken = (user) =>
    jwt.sign(
        { id: user.id, email: user.correo_electronico },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

// ==========================================
// 1. REGISTRAR USUARIO
// ==========================================
const registerUser = async (req, res) => {
    const { email, password, nombre } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Correo y contraseña son obligatorios" });

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [resultado] = await connection.query(
            'INSERT INTO usuarios (nombre, correo_electronico, hash_contrasena, pin_seguridad) VALUES (?, ?, ?, ?)',
            [nombre && nombre.trim() ? nombre.trim() : 'Usuario Nuevo', email, hashedPassword, '']
        );

        await connection.commit();

        const nuevoUsuario = { id: resultado.insertId, correo_electronico: email };
        res.status(201).json({
            message: 'Usuario registrado con éxito',
            token: generarToken(nuevoUsuario),
            user: { id: resultado.insertId, nombre: nombre || 'Usuario Nuevo', email }
        });
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

        res.status(200).json({
            message: "Login exitoso",
            token: generarToken(user),
            user: { id: user.id, nombre: user.nombre, email: user.correo_electronico }
        });
    } catch (error) {
        res.status(500).json({ message: "Error al intentar iniciar sesión." });
    }
};

// ==========================================
// 3. ELIMINAR CUENTA
// ==========================================
const deleteUser = async (req, res) => {
    // Solo puedes borrar TU propia cuenta: el correo sale del token.
    const email = req.usuario.email;

    try {
        const [result] = await db.query('DELETE FROM usuarios WHERE correo_electronico = ?', [email]);
        if (result.affectedRows === 0) return res.status(404).json({ message: "El usuario no se encontró." });
        res.status(200).json({ message: "Cuenta eliminada correctamente." });
    } catch (error) {
        res.status(500).json({ message: "Error al borrar la cuenta." });
    }
};

// ==========================================
// 3.5 CAMBIAR CONTRASEÑA
// ==========================================
// Mismas reglas que pide el formulario, pero verificadas tambien aqui:
// el navegador se puede saltar, el servidor no.
const validarPasswordSegura = (pass) => {
    if (!pass || pass.length < 8) return "Debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(pass)) return "Debe incluir al menos una letra MAYÚSCULA.";
    if (!/[a-z]/.test(pass)) return "Debe incluir al menos una letra minúscula.";
    if (!/[0-9]/.test(pass)) return "Debe incluir al menos un número.";
    if (!/[@$!%*?&.,\-_]/.test(pass)) return "Debe incluir al menos un carácter especial.";
    return "OK";
};

const changePassword = async (req, res) => {
    // El correo sale del token: solo puedes cambiar TU contraseña.
    const email = req.usuario.email;
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
        return res.status(400).json({ message: "Se requiere la contraseña actual y la nueva." });
    }

    const estado = validarPasswordSegura(passwordNueva);
    if (estado !== "OK") return res.status(400).json({ message: estado });

    if (passwordActual === passwordNueva) {
        return res.status(400).json({ message: "La contraseña nueva debe ser distinta de la actual." });
    }

    try {
        const [users] = await db.query('SELECT id, hash_contrasena FROM usuarios WHERE correo_electronico = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: "El usuario no existe." });

        // Se exige la contraseña actual para que un token robado no baste
        // para quedarse con la cuenta.
        const isMatch = await bcrypt.compare(passwordActual, users[0].hash_contrasena);
        if (!isMatch) return res.status(401).json({ message: "La contraseña actual no es correcta." });

        const nuevoHash = await bcrypt.hash(passwordNueva, 10);
        await db.query('UPDATE usuarios SET hash_contrasena = ? WHERE correo_electronico = ?', [nuevoHash, email]);

        res.status(200).json({ message: "Contraseña actualizada correctamente." });
    } catch (error) {
        console.error("Error al cambiar contraseña:", error);
        res.status(500).json({ message: "No se pudo cambiar la contraseña." });
    }
};

// ==========================================
// ☁️ 4. GUARDAR DATOS EN LA NUBE
// ==========================================
const saveFinancialData = async (req, res) => {
    // El correo sale del token, NUNCA del cuerpo de la peticion.
    // Si se tomara del body, cualquiera podria sobrescribir los datos de otro usuario.
    const email = req.usuario.email;
    const { financialData } = req.body;
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
    // Igual que al guardar: el correo viene del token, no de la URL.
    // Antes cualquiera podia leer los datos de otro poniendo su correo en la ruta.
    const email = req.usuario.email;
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

module.exports = { registerUser, loginUser, deleteUser, changePassword, saveFinancialData, getFinancialData };