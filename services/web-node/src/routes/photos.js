const express = require('express');
const path = require('path');
const repo = require('../services/repository.service');
const thumbService = require('../services/thumbnail.service');

const router = express.Router();

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function isImage(filename) {
    return IMAGE_EXTS.has(path.extname(filename).toLowerCase());
}

/**
 * Recorre recursivamente el Home y recolecta todas las imágenes.
 */
function collectImages(uid, dirPath = '') {
    const items = repo.listDirectory(uid, dirPath);
    let images = [];
    for (const item of items) {
        if (item.isDirectory) {
            images = images.concat(collectImages(uid, item.path));
        } else if (isImage(item.name)) {
            images.push(item);
        }
    }
    return images;
}

// GET /api/photos — lista todas las imágenes del Home
router.get('/', (req, res) => {
    try {
        const uid = req.user.uid;
        // Ordenar por: ?sort=name | ?sort=date (default)
        const sort = req.query.sort || 'date';

        let images = collectImages(uid);

        if (sort === 'name') {
            images.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            images.sort((a, b) =>
                new Date(b.modified) - new Date(a.modified)
            );
        }

        res.json({ images, total: images.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/photos/view?path=photos/lab.jpg — sirve la imagen original
router.get('/view', (req, res) => {
    try {
        const uid = req.user.uid;
        const imgPath = req.query.path;
        if (!imgPath) return res.status(400).json({ error: 'path requerido' });
        if (!isImage(imgPath)) return res.status(400).json({ error: 'No es una imagen' });

        const file = repo.readFile(uid, imgPath);
        if (!file) return res.status(404).json({ error: 'Imagen no encontrada' });

        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Length', file.size);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(file.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/photos/thumb?path=photos/lab.jpg — thumbnail 300x300
router.get('/thumb', async (req, res) => {
    try {
        const uid = req.user.uid;
        const imgPath = req.query.path;
        if (!imgPath) return res.status(400).json({ error: 'path requerido' });
        if (!isImage(imgPath)) return res.status(400).json({ error: 'No es imagen' });

        const thumbBuffer = await thumbService.getThumbnail(uid, imgPath);
        if (!thumbBuffer) return res.status(404).json({ error: 'Imagen no encontrada' });

        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(thumbBuffer);
    } catch (err) {
        console.error('Thumbnail error:', err.message);
        // Si sharp falla, servir la imagen original
        try {
            const file = repo.readFile(req.user.uid, req.query.path);
            if (file) {
                res.setHeader('Content-Type', file.mimeType);
                res.send(file.data);
            } else {
                res.status(404).json({ error: 'No encontrado' });
            }
        } catch {
            res.status(500).json({ error: err.message });
        }
    }
});

module.exports = router;




