#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.party"

lan_ip() {
    local iface ip
    iface="$(route -n get default 2>/dev/null | awk '/interface:/{print $2}')"
    if [[ -n "${iface}" ]]; then
        ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
        if [[ -n "${ip}" ]]; then
            printf '%s' "$ip"
            return
        fi
    fi
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1
}

LAN_IP="$(lan_ip || true)"
if [[ -z "${LAN_IP}" ]]; then
    echo "Не нашёл адрес Mac в локальной сети. Подключи его к Wi-Fi и запусти скрипт снова." >&2
    exit 1
fi
# YouTube refuses some embeds when the page host is a raw IP. The tablet
# opens ${LAN_IP}.nip.io so YouTube sees a hostname. Guests, the QR code,
# and Convex stay on the raw IP: phones often cannot resolve nip.io.
PARTY_HOST="${LAN_IP}.nip.io"

ADMIN_KEY=""
if [[ -f "$ENV_FILE" ]]; then
    ADMIN_KEY="$(awk -F= '/^CONVEX_SELF_HOSTED_ADMIN_KEY=/{print substr($0, index($0, "=") + 1)}' "$ENV_FILE")"
fi

write_env() {
    cat >"$ENV_FILE" <<EOF
LAN_IP=${LAN_IP}
PARTY_HOST=${PARTY_HOST}
CONVEX_SELF_HOSTED_ADMIN_KEY=${ADMIN_KEY}
NEXT_PUBLIC_CONVEX_URL=http://${LAN_IP}:3210
NEXT_PUBLIC_CONVEX_SITE_URL=http://${LAN_IP}:3211
NEXT_PUBLIC_SITE_URL=http://${LAN_IP}:3000
SITE_URL=http://${LAN_IP}:3000
EOF
}

write_env

echo "Планшет (экран с музыкой): http://${PARTY_HOST}:3000"
echo "Гости: http://${LAN_IP}:3000"
docker compose --env-file "$ENV_FILE" up -d --wait convex

if [[ -z "${ADMIN_KEY}" ]]; then
    ADMIN_KEY="$(
        docker compose --env-file "$ENV_FILE" exec -T convex ./generate_admin_key.sh |
            tr -d '[:space:]'
    )"
    if [[ "${ADMIN_KEY}" != *"|"* ]]; then
        echo "Convex не вернул admin key." >&2
        exit 1
    fi
    write_env
fi

docker compose --env-file "$ENV_FILE" up -d --build --wait app
echo "Готово. Планшет: http://${PARTY_HOST}:3000"
echo "Гости: http://${LAN_IP}:3000"
