const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_ROOT = path.join(__dirname, '..', '..', '..', '..', 'data', 'home');

function getHomePath(uid) {
    const homePath = path.join(DATA_ROOT, uid);
    const resolved = path.resolve(homePath);
    if (!resolved.startsWith(path.resolve(DATA_ROOT))) {
        throw new Error('Path traversal detectado');
    }
    return resolved;
}

function getFilePath(uid, relativePath) {
    const homePath = getHomePath(uid);
    const filePath = path.join(homePath, relativePath);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(homePath)) {
        throw new Error('Path traversal detectado');
    }
    return resolved;
}

function listDirectory(uid, relativePath = '') {
    const dirPath = getFilePath(uid, relativePath);
    if (!fs.existsSync(dirPath)) return [];

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries
        .filter(e => !e.name.startsWith('.'))
        .map(entry => {
            const fullPath = path.join(dirPath, entry.name);
            const stats = fs.statSync(fullPath);
            const rel = path.join(relativePath, entry.name);
            return {
                name: entry.name,
                path: rel,
                isDirectory: entry.isDirectory(),
                size: entry.isDirectory() ? 0 : stats.size,
                modified: stats.mtime.toISOString(),
                mode: '0' + (stats.mode & parseInt('777', 8)).toString(8),
            };
        });
}

function dirSize(dirPath) {
    let total = 0;
    if (!fs.existsSync(dirPath)) return 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            total += dirSize(fullPath);
        } else {
            total += fs.statSync(fullPath).size;
        }
    }
    return total;
}

function calculateUsedBytes(uid) {
    return dirSize(getHomePath(uid));
}

function getQuota(uid) {
    const quotaPath = path.join(getHomePath(uid), '.quota');
    if (!fs.existsSync(quotaPath)) return { total_bytes: 5368709120 };
    return JSON.parse(fs.readFileSync(quotaPath, 'utf8'));
}

function fileHash(filePath) {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
}

function saveFile(uid, relativePath, buffer) {
    const quota = getQuota(uid);
    const usedBytes = calculateUsedBytes(uid);
    if (usedBytes + buffer.length > quota.total_bytes) {
        const err = new Error('Cuota excedida');
        err.code = 'QUOTA_EXCEEDED';
        err.used = usedBytes;
        err.total = quota.total_bytes;
        throw err;
    }
    const filePath = getFilePath(uid, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, buffer);
    const stats = fs.statSync(filePath);
    return {
        path: relativePath,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        sha256: fileHash(filePath),
    };
}

function deleteFile(uid, relativePath) {
    const filePath = getFilePath(uid, relativePath);
    if (!fs.existsSync(filePath)) {
        const err = new Error('Archivo no encontrado');
        err.code = 'NOT_FOUND';
        throw err;
    }
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
        fs.rmSync(filePath, { recursive: true });
    } else {
        fs.unlinkSync(filePath);
    }
}

function readFile(uid, relativePath) {
    const filePath = getFilePath(uid, relativePath);
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    const data = fs.readFileSync(filePath);
    return { data, size: stats.size, modified: stats.mtime.toISOString(), mimeType: getMimeType(relativePath) };
}

function renameFile(uid, oldPath, newPath) {
    const src = getFilePath(uid, oldPath);
    const dest = getFilePath(uid, newPath);
    if (!fs.existsSync(src)) throw new Error('Archivo origen no encontrado');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
}

function createDirectory(uid, relativePath) {
    const dirPath = getFilePath(uid, relativePath);
    fs.mkdirSync(dirPath, { recursive: true });
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        '.txt': 'text/plain', '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.webp': 'image/webp',
        '.gif': 'image/gif', '.mp4': 'video/mp4',
        '.webm': 'video/webm', '.csv': 'text/csv',
        '.json': 'application/json', '.c': 'text/x-c',
        '.py': 'text/x-python', '.zip': 'application/zip',
    };
    return types[ext] || 'application/octet-stream';
}

module.exports = {
    getHomePath, getFilePath, listDirectory,
    calculateUsedBytes, getQuota, fileHash,
    saveFile, deleteFile, readFile,
    renameFile, createDirectory, getMimeType, DATA_ROOT,
};