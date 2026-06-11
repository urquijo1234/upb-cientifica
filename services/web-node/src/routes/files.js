const express = require('express');
const multer = require('multer');
const path = require('path');
const repo = require('../services/repository.service');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 },
});

// GET /api/files?path=files/subfolder
router.get('/', (req, res) => {
    try {
        const uid = req.user.uid;
        const relativePath = req.query.path || '';
        const files = repo.listDirectory(uid, relativePath);
        const quota = repo.getQuota(uid);
        const usedBytes = repo.calculateUsedBytes(uid);
        res.json({
            path: relativePath,
            files,
            quota: {
                total: quota.total_bytes,
                used: usedBytes,
                remaining: quota.total_bytes - usedBytes,
                percentUsed: Math.round((usedBytes / quota.total_bytes) * 100),
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/files/upload?dest=files
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });
        const uid = req.user.uid;
        const dest = req.query.dest || 'files';
        const relativePath = path.join(dest, req.file.originalname);
        const result = repo.saveFile(uid, relativePath, req.file.buffer);
        res.json({ success: true, file: result });
    } catch (err) {
        if (err.code === 'QUOTA_EXCEEDED') {
            return res.status(413).json({ error: 'Cuota excedida', used: err.used, total: err.total });
        }
        res.status(500).json({ error: err.message });
    }
});

// GET /api/files/download?path=files/readme.txt
router.get('/download', (req, res) => {
    try {
        const uid = req.user.uid;
        const relativePath = req.query.path;
        if (!relativePath) return res.status(400).json({ error: 'path requerido' });
        const file = repo.readFile(uid, relativePath);
        if (!file) return res.status(404).json({ error: 'No encontrado' });
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(relativePath)}"`);
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Length', file.size);
        res.send(file.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/files?path=files/readme.txt
router.delete('/', (req, res) => {
    try {
        const uid = req.user.uid;
        const relativePath = req.query.path;
        if (!relativePath) return res.status(400).json({ error: 'path requerido' });
        repo.deleteFile(uid, relativePath);
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'NOT_FOUND') return res.status(404).json({ error: err.message });
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/files/rename
router.put('/rename', (req, res) => {
    try {
        const uid = req.user.uid;
        const { oldPath, newPath } = req.body;
        if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath y newPath requeridos' });
        repo.renameFile(uid, oldPath, newPath);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/files/mkdir
router.post('/mkdir', (req, res) => {
    try {
        const uid = req.user.uid;
        const { dirPath } = req.body;
        if (!dirPath) return res.status(400).json({ error: 'dirPath requerido' });
        repo.createDirectory(uid, dirPath);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/files/quota
router.get('/quota', (req, res) => {
    try {
        const uid = req.user.uid;
        const quota = repo.getQuota(uid);
        const usedBytes = repo.calculateUsedBytes(uid);
        res.json({
            total: quota.total_bytes,
            used: usedBytes,
            remaining: quota.total_bytes - usedBytes,
            percentUsed: Math.round((usedBytes / quota.total_bytes) * 100),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;