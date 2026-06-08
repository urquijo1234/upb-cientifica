const express = require('express');
const router = express.Router();

// GET /api/files — listar archivos (mock por ahora)
router.get('/', (req, res) => {
    // TODO: Llamar al gRPC Server para listar archivos reales
    res.json({
        files: [
            { name: 'documento.pdf', size: 1024, perms: '0644' },
            { name: 'datos/', size: 0, perms: '0755', isDir: true },
            { name: 'fotos/lab.jpg', size: 2048, perms: '0644' },
        ],
        quota: { used: 3072, total: 5368709120 }
    });
});

module.exports = router;