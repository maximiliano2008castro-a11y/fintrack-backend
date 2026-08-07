// Punto de entrada para Vercel.
//
// Vercel no arranca un servidor que escucha un puerto: importa este archivo,
// y por cada peticion que llega invoca la funcion que exportamos aqui.
// Como Express ya es una funcion (req, res), basta con reexportar la app.
//
// El servidor tradicional sigue viviendo en server.js para Render y para local.
module.exports = require('../server.js');
