const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const repo = require('./repository.service');

const THUMB_SIZE = 300; // px

/**
 * Genera un thumbnail para una imagen y lo guarda en
 * .thumbs/<nombre>.jpg dentro del Home del usuario.
 * Si ya existe y es más nuevo que el original, lo retorna directamente.
 */
async function getThumbnail(uid, imagePath) {
    const homePath = repo.getHomePath(uid);
    const thumbDir = path.join(homePath, '.thumbs');
    const thumbName = imagePath.replace(/[\/\\]/g, '_') + '.jpg';
    const thumbPath = path.join(thumbDir, thumbName);

    const originalPath = repo.getFilePath(uid, imagePath);
    if (!fs.existsSync(originalPath)) return null;

    const originalStat = fs.statSync(originalPath);

    // Si el thumbnail existe y es más reciente que el original, usarlo
    if (fs.existsSync(thumbPath)) {
        const thumbStat = fs.statSync(thumbPath);
        if (thumbStat.mtime > originalStat.mtime) {
            return fs.readFileSync(thumbPath);
        }
    }

    // Generar thumbnail
    fs.mkdirSync(thumbDir, { recursive: true });
    const buffer = await sharp(originalPath)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 80 })
        .toBuffer();

    fs.writeFileSync(thumbPath, buffer);
    return buffer;
}

module.exports = { getThumbnail };