const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Cargar la clave pública (al inicio del servidor)
const publicKeyPath = path.join(
    __dirname,
    '../../../../infrastructure/keys/jwt_public.pem'
);

let publicKey;
try {
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    console.log('[auth] Clave pública JWT cargada');
} catch (err) {
    console.error('[auth] ERROR: No se pudo cargar la clave pública:', err.message);
    throw err;
}

/**
 * Middleware que valida JWT desde:
 * 1. Cookie 'jwt' (para navegador)
 * 2. Header 'Authorization: Bearer <token>' (para APIs)
 *
 * Si es válido, agrega req.user con los claims.
 * Si no, retorna 401.
 */
function authRequired(req, res, next) {
    let token = null;

    // 1. Cookie
    if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    // 2. Authorization header
    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            error: 'No autenticado',
            message: 'Se requiere un JWT válido'
        });
    }

    try {
        const decoded = jwt.verify(token, publicKey, {
            algorithms: ['RS256'],
            issuer: 'upb-cientifica-soap',
        });

        // Adjuntar el usuario decodificado a la request
        req.user = {
            uid: decoded.sub,
            dn: decoded.dn,
            email: decoded.email,
            roles: decoded.roles || [],
        };

        next();
    } catch (err) {
        console.error('[auth] JWT inválido:', err.message);
        return res.status(401).json({
            error: 'JWT inválido',
            message: err.message
        });
    }
}

/**
 * Middleware que requiere un rol específico.
 * Uso: app.get('/admin', authRequired, requireRole('ADMIN'), handler)
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        const hasRole = req.user.roles.some(r => allowedRoles.includes(r));
        if (!hasRole) {
            return res.status(403).json({
                error: 'Sin permisos',
                message: `Requiere uno de: ${allowedRoles.join(', ')}`
            });
        }
        next();
    };
}

module.exports = { authRequired, requireRole };