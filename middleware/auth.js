const jwt = require('jsonwebtoken');

/**
 * Verifica el token JWT que viaja en el header Authorization.
 * Si es valido, deja los datos del usuario en req.usuario y deja pasar.
 * Si no, corta la peticion.
 */
const verificarToken = (req, res, next) => {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Falta el token de sesion.' });
    }

    const token = header.slice(7).trim();

    try {
        const datos = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = { id: datos.id, email: datos.email };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Tu sesion expiro. Vuelve a iniciar sesion.' });
        }
        return res.status(401).json({ message: 'Sesion invalida.' });
    }
};

module.exports = { verificarToken };
