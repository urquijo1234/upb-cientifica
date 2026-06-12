// Uso: node scripts/generate-gpg-key.js <username> [email]
// Ejemplo: node scripts/generate-gpg-key.js jcurquijo jcurquijo@upb.edu.co

const openpgp = require('../services/web-node/node_modules/openpgp');
const fs = require('fs');
const path = require('path');

const username = process.argv[2];
const email = process.argv[3] || `${username}@upbcientifica.local`;

if (!username) {
    console.error('Uso: node generate-gpg-key.js <username> [email]');
    process.exit(1);
}

const homeDir = path.join(__dirname, '..', 'data', 'home', username);
const gpgDir = path.join(homeDir, '.gpg');

if (!fs.existsSync(homeDir)) {
    console.error(`Error: home no existe: ${homeDir}`);
    console.error(`Ejecuta primero: ./scripts/provision-home.sh ${username}`);
    process.exit(1);
}

(async () => {
    console.log(`Generando par de claves GPG para ${username} <${email}>...`);

    const { privateKey, publicKey } = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: 3072,
        userIDs: [{ name: username, email }],
        passphrase: '',   // sin passphrase para facilitar el backup automático
    });

    fs.mkdirSync(gpgDir, { recursive: true });

    // Guardar clave pública en el Home (la usa el servidor para cifrar)
    fs.writeFileSync(path.join(homeDir, '.gpg.pub'), publicKey);

    // Guardar clave privada en .gpg/ (se entrega al usuario y se borra del servidor)
    const privateKeyFile = path.join(gpgDir, `${username}_private.gpg`);
    fs.writeFileSync(privateKeyFile, privateKey);

    console.log('✅ Par GPG generado:');
    console.log(`   Clave pública : data/home/${username}/.gpg.pub`);
    console.log(`   Clave privada : data/home/${username}/.gpg/${username}_private.gpg`);
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log(`   1. Entrega el archivo ${username}_private.gpg al usuario`);
    console.log(`   2. Luego bórralo del servidor:`);
    console.log(`      del data\\home\\${username}\\.gpg\\${username}_private.gpg`);
})();