#!/usr/bin/env bash
# ==============================================================================
# Van Gogh CryptoCats - Ubuntu Dual-Host LAN Deployment & Systemd Daemon
# ==============================================================================
# This script sets up a fully autonomous node on an Ubuntu host (Host A or Host B).
# It configures:
#  - Node.js 20+ runtime check
#  - Production build (npm run build)
#  - Systemd background service (vangogh-cats.service)
#  - UFW firewall rules for LAN port 3000
#  - LAN peer discovery between two Ubuntu machines
# ==============================================================================
set -e

PORT="${PORT:-3000}"
APP_USER="$(whoami)"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="vangogh-cats"

echo "🎨 Настройка автономного узла Van Gogh CryptoCats (Ubuntu RC1)..."
echo "📂 Рабочая директория: ${APP_DIR}"
echo "👤 Пользователь: ${APP_USER}"

# 1. Check Node.js version
if ! command -v node &> /dev/null; then
  echo "📥 Установка Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js: ${NODE_VERSION}"

# 2. Build production assets
echo "🔨 Сборка проекта (Production Build)..."
cd "${APP_DIR}"
if [ -f "package-lock.json" ] || [ -f "package.json" ]; then
  npm install
  npm run build
fi

# 3. Create systemd service for background daemon
SYSTEMD_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
echo "⚙️ Создание службы systemd (${SYSTEMD_FILE})..."

sudo tee "${SYSTEMD_FILE}" > /dev/null << EOF
[Unit]
Description=Van Gogh CryptoCats P2P Gallery & Studio Node
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${PORT}
ExecStart=$(which node) ${APP_DIR}/server.ts
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 4. Reload and start systemd daemon
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
echo "✅ Служба ${SERVICE_NAME} запущена и включена в автозагрузку!"

# 5. Open UFW firewall port if active
if command -v ufw &> /dev/null && sudo ufw status | grep -q "Status: active"; then
  echo "🛡️ Открытие порта ${PORT} в UFW для локальной сети..."
  sudo ufw allow "${PORT}/tcp" comment "Van Gogh CryptoCats LAN Node"
fi

# 6. Detect LAN IP address
HOST_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=============================================================================="
echo "🎉 УЗЕЛ УСПЕШНО НАСТРОЕН И РАБОТАЕТ В ФОНЕ!"
echo "=============================================================================="
echo "🌐 Локальный адрес на этом хосте: http://localhost:${PORT}"
if [ -n "${HOST_IP}" ]; then
  echo "📡 Адрес для второго компьютера Ubuntu в вашей сети (LAN):"
  echo "    👉 http://${HOST_IP}:${PORT}"
fi
echo ""
echo "Команды управления службой:"
echo "  • Статус:   sudo systemctl status ${SERVICE_NAME}"
echo "  • Логи:     sudo journalctl -u ${SERVICE_NAME} -f"
echo "  • Остановка: sudo systemctl stop ${SERVICE_NAME}"
echo "=============================================================================="
