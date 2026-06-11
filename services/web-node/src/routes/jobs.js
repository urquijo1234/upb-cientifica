const express = require('express');
const router = express.Router();
const rmiClient = require('../services/rmi.bridge.client');

// POST /api/jobs — enviar trabajo MPI
router.post('/', async (req, res) => {
    try {
        const jwt = req.cookies.jwt;
        const result = await rmiClient.submitJob(req.body, jwt);
        res.json(result);
    } catch (err) {
        console.error('Job submit error:', err.message);
        res.status(500).json({ error: 'Error al enviar trabajo' });
    }
});

router.get('/:id/status', async (req, res) => {
    try {
        const jwt = req.cookies.jwt;
        const status = await rmiClient.getJobStatus(req.params.id, jwt);
        res.json(status);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

router.get('/:id/result', async (req, res) => {
    try {
        const jwt = req.cookies.jwt;
        const result = await rmiClient.getJobResult(req.params.id, jwt);
        res.json(result);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

module.exports = router;