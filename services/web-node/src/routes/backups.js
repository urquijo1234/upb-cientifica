const express = require('express');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const zlib = require('zlib');
const openpgp = require('openpgp');
const repo = require('../services/repository.service');

const router = express.Router();

// GET /api/backups — lista backups del usuario
router.get('/', (req, res) => {
    try {
        const uid = req.user.uid;
        const backupsDir = path.join(repo.getHomePath(uid), '.backups');
        const gpgPub = path.join(repo.getHomePath(uid), '.gpg.pub');
        const hasGpgKey = fs.existsSync(gpgPub);

        if (!fs.existsSync(backupsDir)) {
            return res.json({ backups: [], hasGpgKey });
        }

        const backups = fs.readdirSync(backupsDir)
            .filter(f => f.endsWith('.tar.gz.gpg') || f.endsWith('.gpg'))
            .map(f => {
                const fullPath = path.join(backupsDir, f);
                const stats = fs.statSync(fullPath);
                return { name: f, size: stats.size, created: stats.mtime.toISOString() };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created));

        res.json({ backups, hasGpgKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/backups/status
router.get('/status', (req, res) => {
    try {
        const uid = req.user.uid;
        const gpgPub = path.join(repo.getHomePath(uid), '.gpg.pub');
        const hasGpgKey = fs.existsSync(gpgPub);
        res.json({ hasGpgKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/backups/pubkey
router.get('/pubkey', (req, res) => {
    try {
        const uid = req.user.uid;
        const gpgPub = path.join(repo.getHomePath(uid), '.gpg.pub');
        if (!fs.existsSync(gpgPub)) {
            return res.status(404).json({ error: 'Sin clave GPG' });
        }
        const publicKey = fs.readFileSync(gpgPub, 'utf8');
        res.json({ publicKey });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/backups/trigger — backup en JavaScript puro (sin bash)
router.post('/trigger', async (req, res) => {
    const uid = req.user.uid;
    const homePath = repo.getHomePath(uid);
    const gpgPubPath = path.join(homePath, '.gpg.pub');

    if (!fs.existsSync(gpgPubPath)) {
        return res.status(400).json({
            error: 'Sin clave GPG',
            message: 'Ejecuta generate-user-gpg.sh primero.'
        });
    }

    // Responder inmediatamente, hacer backup en background
    res.json({ success: true, message: 'Backup iniciado. Listo en unos segundos.' });

    // === Backup asíncrono ===
    setImmediate(async () => {
        try {
            const backupsDir = path.join(homePath, '.backups');
            fs.mkdirSync(backupsDir, { recursive: true });

            const timestamp = new Date().toISOString()
                .replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
            const outFile = path.join(backupsDir, `backup_${timestamp}.tar.gz.gpg`);

            // 1. Leer clave pública OpenPGP
            const armoredKey = fs.readFileSync(gpgPubPath, 'utf8');
            const publicKey = await openpgp.readKey({ armoredKey });

            // 2. Crear el tar.gz en memoria (stream → buffer)
            const tarBuffer = await createTarGz(homePath, uid);
            console.log(`[backup] tar.gz creado: ${(tarBuffer.length / 1024 / 1024).toFixed(2)} MB`);

            // 3. Cifrar con OpenPGP
            const encrypted = await openpgp.encrypt({
                message: await openpgp.createMessage({ binary: tarBuffer }),
                encryptionKeys: publicKey,
                format: 'binary',
            });

            // 4. Guardar archivo cifrado
            fs.writeFileSync(outFile, Buffer.from(encrypted));
            console.log(`[backup] OK: ${outFile}`);

            // 5. Conservar solo los últimos 7 backups
            const allBackups = fs.readdirSync(backupsDir)
                .filter(f => f.endsWith('.gpg'))
                .map(f => ({ name: f, mtime: fs.statSync(path.join(backupsDir, f)).mtime }))
                .sort((a, b) => b.mtime - a.mtime);

            allBackups.slice(7).forEach(b => {
                fs.unlinkSync(path.join(backupsDir, b.name));
                console.log(`[backup] eliminado backup antiguo: ${b.name}`);
            });

        } catch (err) {
            console.error('[backup] ERROR:', err.message);
        }
    });
});

/**
 * Crea un tar.gz del Home del usuario en memoria.
 * Excluye .backups, .gpg y .thumbs para no crear recursión.
 */
/**
 * Crea un tar.gz del Home del usuario en memoria.
 * Implementación nativa sin dependencias externas.
 */
function createTarGz(homePath, uid) {
    return new Promise((resolve, reject) => {
        try {
            const chunks = [];

            // Recopilar todos los archivos recursivamente
            function walkDir(dir, baseInTar) {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                const files = [];
                for (const entry of entries) {
                    const excluded = ['.backups', '.gpg', '.thumbs'];
                    if (excluded.includes(entry.name)) continue;
                    const fullPath = path.join(dir, entry.name);
                    const tarPath = path.join(baseInTar, entry.name);
                    if (entry.isDirectory()) {
                        files.push(...walkDir(fullPath, tarPath));
                    } else {
                        files.push({ fullPath, tarPath });
                    }
                }
                return files;
            }

            const files = walkDir(homePath, uid);

            // Construir el tar manualmente (formato POSIX ustar)
            function padEnd(str, len, char = '\0') {
                return (str + char.repeat(len)).slice(0, len);
            }
            function octal(num, len) {
                return padEnd(num.toString(8), len - 1) + '\0';
            }

            function writeTarEntry(filePath, tarName) {
                const data = fs.readFileSync(filePath);
                const size = data.length;
                const name = tarName.replace(/\\/g, '/');

                // Header: 512 bytes
                const header = Buffer.alloc(512, 0);
                // name (100)
                Buffer.from(name.slice(-100)).copy(header, 0);
                // mode (8)
                Buffer.from(octal(0o644, 8)).copy(header, 100);
                // uid, gid (8 cada uno)
                Buffer.from(octal(0, 8)).copy(header, 108);
                Buffer.from(octal(0, 8)).copy(header, 116);
                // size (12)
                Buffer.from(octal(size, 12)).copy(header, 124);
                // mtime (12)
                const mtime = Math.floor(fs.statSync(filePath).mtimeMs / 1000);
                Buffer.from(octal(mtime, 12)).copy(header, 136);
                // type: regular file
                header[156] = 48; // '0'
                // magic
                Buffer.from('ustar  \0').copy(header, 257);

                // Checksum
                Buffer.from('        ').copy(header, 148);
                let checksum = 0;
                for (let i = 0; i < 512; i++) checksum += header[i];
                Buffer.from(octal(checksum, 7) + '\0').copy(header, 148);

                chunks.push(header);
                chunks.push(data);

                // Padding al múltiplo de 512
                const remainder = size % 512;
                if (remainder !== 0) {
                    chunks.push(Buffer.alloc(512 - remainder, 0));
                }
            }

            // Escribir todos los archivos
            for (const { fullPath, tarPath } of files) {
                writeTarEntry(fullPath, tarPath);
            }

            // End of archive: 2 bloques de 512 bytes a cero
            chunks.push(Buffer.alloc(1024, 0));

            const tarBuffer = Buffer.concat(chunks);

            // Comprimir con gzip
            zlib.gzip(tarBuffer, (err, compressed) => {
                if (err) return reject(err);
                resolve(compressed);
            });

        } catch (err) {
            reject(err);
        }
    });
}

module.exports = router;