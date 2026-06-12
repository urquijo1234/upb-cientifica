#!/bin/bash
# Backup cifrado con GPG para todos los usuarios
# Crontab: 0 2 * * * /ruta/al/repo/scripts/backup-cron.sh
# (Se ejecuta a las 2 AM)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_ROOT/data/home"
LOG_FILE="$PROJECT_ROOT/logs/backup-$(date +%Y%m%d).log"

mkdir -p "$PROJECT_ROOT/logs"

echo "[$(date)] === Inicio de backup ===" >> "$LOG_FILE"

for USER_HOME in "$DATA_DIR"/*/; do
    USERNAME=$(basename "$USER_HOME")
    GPG_PUB="$USER_HOME/.gpg.pub"
    BACKUP_DIR="$USER_HOME/.backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.tar.gz.gpg"

    if [ ! -f "$GPG_PUB" ]; then
        echo "[$(date)] SKIP $USERNAME: sin clave pública GPG" >> "$LOG_FILE"
        continue
    fi

    mkdir -p "$BACKUP_DIR"

    echo "[$(date)] Iniciando backup de $USERNAME..." >> "$LOG_FILE"

    # Importar la clave pública a un keyring temporal
    TMPGPG=$(mktemp -d)
    gpg --homedir "$TMPGPG" --import "$GPG_PUB" 2>/dev/null
    
    # Obtener el fingerprint del receptor
    RECIPIENT=$(gpg --homedir "$TMPGPG" --list-keys --with-colons 2>/dev/null \
        | grep "^pub" | head -1 | cut -d: -f5)

    if [ -z "$RECIPIENT" ]; then
        echo "[$(date)] ERROR $USERNAME: no se pudo obtener fingerprint" >> "$LOG_FILE"
        rm -rf "$TMPGPG"
        continue
    fi

    # Crear tar.gz excluyendo .backups y .gpg para no meter el backup dentro del backup
    tar -czf - \
        --exclude="$USER_HOME/.backups" \
        --exclude="$USER_HOME/.gpg" \
        --exclude="$USER_HOME/.thumbs" \
        -C "$DATA_DIR" "$USERNAME" 2>/dev/null \
    | gpg --homedir "$TMPGPG" \
        --trust-model always \
        --recipient "$RECIPIENT" \
        --encrypt \
        --output "$BACKUP_FILE"

    EXIT_CODE=$?
    rm -rf "$TMPGPG"

    if [ $EXIT_CODE -eq 0 ]; then
        SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
        echo "[$(date)] OK $USERNAME: $BACKUP_FILE ($SIZE)" >> "$LOG_FILE"
        
        # Conservar solo los últimos 7 backups por usuario
        ls -t "$BACKUP_DIR"/backup_*.tar.gz.gpg 2>/dev/null \
            | tail -n +8 \
            | xargs -r rm -f
    else
        echo "[$(date)] ERROR $USERNAME: falló el cifrado (code $EXIT_CODE)" >> "$LOG_FILE"
        rm -f "$BACKUP_FILE"
    fi
done

echo "[$(date)] === Fin de backup ===" >> "$LOG_FILE"