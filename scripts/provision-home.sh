#!/bin/bash
USERNAME=$1
QUOTA_GB=${2:-5}
QUOTA_BYTES=$((QUOTA_GB * 1073741824))
BASE_DIR="data/home"

if [ -z "$USERNAME" ]; then
    echo "Uso: $0 <username> [quota_gb]"
    exit 1
fi

HOME_DIR="$BASE_DIR/$USERNAME"
mkdir -p "$HOME_DIR"/{files,photos,videos,sync,.backups}
echo "{\"total_bytes\": $QUOTA_BYTES}" > "$HOME_DIR/.quota"
echo "Home creado: $HOME_DIR (cuota: ${QUOTA_GB} GB)"