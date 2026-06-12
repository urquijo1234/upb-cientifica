#!/bin/bash
# Uso: ./scripts/generate-user-gpg.sh <username> <email>
# Ejemplo: ./scripts/generate-user-gpg.sh jcurquijo jcurquijo@upb.edu.co

USERNAME=$1
EMAIL=${2:-"$USERNAME@upbcientifica.local"}
HOME_DIR="data/home/$USERNAME"
GPG_DIR="$HOME_DIR/.gpg"

if [ -z "$USERNAME" ]; then
    echo "Uso: $0 <username> [email]"
    exit 1
fi

if [ ! -d "$HOME_DIR" ]; then
    echo "Error: directorio home no existe: $HOME_DIR"
    echo "Ejecuta primero: ./scripts/provision-home.sh $USERNAME"
    exit 1
fi

mkdir -p "$GPG_DIR"
chmod 700 "$GPG_DIR"

# Archivo de parámetros para generación batch (sin interacción)
GPG_PARAMS=$(mktemp)
cat > "$GPG_PARAMS" << EOF
%echo Generando par de claves GPG para $USERNAME
Key-Type: RSA
Key-Length: 3072
Name-Real: $USERNAME
Name-Email: $EMAIL
Expire-Date: 0
%no-protection
%commit
%echo done
EOF

# Generar el par de claves con homedir propio para este usuario
GNUPGHOME="$GPG_DIR" gpg --batch --gen-key "$GPG_PARAMS"
rm -f "$GPG_PARAMS"

# Exportar la clave pública al archivo .gpg.pub
GNUPGHOME="$GPG_DIR" gpg --armor --export "$EMAIL" > "$HOME_DIR/.gpg.pub"

# Obtener el fingerprint
FINGERPRINT=$(GNUPGHOME="$GPG_DIR" gpg --fingerprint "$EMAIL" 2>/dev/null | grep -A1 "pub" | tail -1 | tr -d ' ')

echo "✅ Par GPG generado para $USERNAME"
echo "   Fingerprint: $FINGERPRINT"
echo "   Clave pública: $HOME_DIR/.gpg.pub"
echo "   Keyring: $GPG_DIR"
echo ""
echo "⚠️  La clave PRIVADA está en $GPG_DIR"
echo "   Para exportarla (entregar al usuario):"
echo "   GNUPGHOME=$GPG_DIR gpg --armor --export-secret-keys $EMAIL > ${USERNAME}_private.gpg"
echo "   Luego elimina la clave privada del servidor:"
echo "   GNUPGHOME=$GPG_DIR gpg --delete-secret-keys $EMAIL"