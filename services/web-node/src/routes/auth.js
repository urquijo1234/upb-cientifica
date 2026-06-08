const express = require('express');
const router = express.Router();
const soapClient = require('../services/soap.client');

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await soapClient.authenticate(username, password);

        // Guardar JWT en cookie httpOnly
        res.cookie('jwt', result.jwt, {
            httpOnly: true,
            maxAge: 8 * 60 * 60 * 1000, // 8 horas
        });

        res.json({ success: true, user: result.userDn, roles: result.roles });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(401).json({ success: false, error: 'Credenciales inválidas' });
    }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('jwt');
    res.json({ success: true });
});

module.exports = router;