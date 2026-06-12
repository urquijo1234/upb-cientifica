const express = require('express');
const path = require('path');
const fs = require('fs');
const repo = require('../services/repository.service');

const router = express.Router();

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mkv', '.avi', '.mov', '.ogg']);

function isVideo(filename) {
    return VIDEO_EXTS.has(path.extname(filename).toLowerCase());
}

function collectVideos(uid, dirPath = '') {
    const items = repo.listDirectory(uid, dirPath);
    let videos = [];
    for (const item of items) {
        if (item.isDirectory) {
            videos = videos.concat(collectVideos(uid, item.path));
        } else if (isVideo(item.name)) {
            videos.push(item);
        }
    }
    return videos;
}

// GET /api/streaming — lista todos los videos del Home
router.get('/', (req, res) => {
    try {
        const uid = req.user.uid;
        const videos = collectVideos(uid);
        videos.sort((a, b) => new Date(b.modified) - new Date(a.modified));
        res.json({ videos, total: videos.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/streaming/play?path=videos/demo.mp4
// Soporta HTTP Range requests para streaming progresivo
router.get('/play', (req, res) => {
    try {
        const uid = req.user.uid;
        const videoPath = req.query.path;

        if (!videoPath) return res.status(400).json({ error: 'path requerido' });
        if (!isVideo(videoPath)) return res.status(400).json({ error: 'No es un video' });

        const filePath = repo.getFilePath(uid, videoPath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Video no encontrado' });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const ext = path.extname(videoPath).toLowerCase();
        const mimeTypes = {
            '.mp4': 'video/mp4', '.webm': 'video/webm',
            '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime', '.ogg': 'video/ogg',
        };
        const mimeType = mimeTypes[ext] || 'video/mp4';

        const range = req.headers.range;

        if (range) {
            // === Streaming parcial (Range Request) ===
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize) {
                res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
                return;
            }

            const chunkSize = end - start + 1;
            const fileStream = fs.createReadStream(filePath, { start, end });

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mimeType,
            });

            fileStream.pipe(res);
        } else {
            // === Stream completo (primera petición del navegador) ===
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mimeType,
                'Accept-Ranges': 'bytes',
            });
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (err) {
        console.error('Streaming error:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
});

module.exports = router;