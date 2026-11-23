#!/usr/bin/env bash
# ==============================================================================
# Van Gogh CryptoCats - Desktop Installer for Ubuntu Linux
# ==============================================================================
set -e

APP_NAME="Van Gogh CryptoCats"
APP_GENERIC_NAME="Art Gallery & AI Studio"
APP_COMMENT="Интерактивная галерея шедевров и AI-генератор котиков в стиле Вана Гога"
APP_ID="vangogh-cats-gallery"
APP_DIR="${HOME}/.local/share/${APP_ID}"
APPLICATIONS_DIR="${HOME}/.local/share/applications"
DESKTOP_DIR="${HOME}/Desktop"
ICON_DIR="${HOME}/.local/share/icons/hicolor/512x512/apps"
TARGET_URL="${1:-${VANGOGH_URL:-http://localhost:3000}}"

echo "🎨 Установка ${APP_NAME} для Ubuntu Linux Desktop..."

# Create local folders
mkdir -p "${APP_DIR}"
mkdir -p "${APPLICATIONS_DIR}"
mkdir -p "${DESKTOP_DIR}"
mkdir -p "${ICON_DIR}"

# Download high-res application icon
ICON_PATH="${ICON_DIR}/${APP_ID}.png"
echo "📥 Скачивание иконки приложения..."
curl -sSL "${TARGET_URL}/pwa-512x512.png" -o "${ICON_PATH}" || true

# If png curl failed, download svg
if [ ! -s "${ICON_PATH}" ]; then
  curl -sSL "${TARGET_URL}/icon.svg" -o "${APP_DIR}/icon.svg" || true
  ICON_PATH="${APP_DIR}/icon.svg"
fi

# Detect available modern browser for native desktop app mode (--app parameter)
LAUNCH_CMD=""
if command -v google-chrome &> /dev/null; then
  LAUNCH_CMD="google-chrome --app=${TARGET_URL} --class=${APP_ID} --user-data-dir=${APP_DIR}/profile"
elif command -v chromium-browser &> /dev/null; then
  LAUNCH_CMD="chromium-browser --app=${TARGET_URL} --class=${APP_ID} --user-data-dir=${APP_DIR}/profile"
elif command -v chromium &> /dev/null; then
  LAUNCH_CMD="chromium --app=${TARGET_URL} --class=${APP_ID} --user-data-dir=${APP_DIR}/profile"
elif command -v brave-browser &> /dev/null; then
  LAUNCH_CMD="brave-browser --app=${TARGET_URL} --class=${APP_ID} --user-data-dir=${APP_DIR}/profile"
elif command -v microsoft-edge &> /dev/null; then
  LAUNCH_CMD="microsoft-edge --app=${TARGET_URL} --class=${APP_ID} --user-data-dir=${APP_DIR}/profile"
elif command -v xdg-open &> /dev/null; then
  LAUNCH_CMD="xdg-open ${TARGET_URL}"
else
  LAUNCH_CMD="firefox --new-window ${TARGET_URL}"
fi

# Create launcher script
LAUNCHER_SCRIPT="${APP_DIR}/launch.sh"
cat << 'EOF' > "${LAUNCHER_SCRIPT}"
#!/usr/bin/env bash
TARGET_URL="##URL##"
APP_ID="vangogh-cats-gallery"
APP_DIR="${HOME}/.local/share/${APP_ID}"

if command -v google-chrome &> /dev/null; then
  exec google-chrome --app="${TARGET_URL}" --class="${APP_ID}" --user-data-dir="${APP_DIR}/profile" "$@"
elif command -v chromium-browser &> /dev/null; then
  exec chromium-browser --app="${TARGET_URL}" --class="${APP_ID}" --user-data-dir="${APP_DIR}/profile" "$@"
elif command -v chromium &> /dev/null; then
  exec chromium --app="${TARGET_URL}" --class="${APP_ID}" --user-data-dir="${APP_DIR}/profile" "$@"
elif command -v brave-browser &> /dev/null; then
  exec brave-browser --app="${TARGET_URL}" --class="${APP_ID}" --user-data-dir="${APP_DIR}/profile" "$@"
elif command -v microsoft-edge &> /dev/null; then
  exec microsoft-edge --app="${TARGET_URL}" --class="${APP_ID}" --user-data-dir="${APP_DIR}/profile" "$@"
elif command -v firefox &> /dev/null; then
  exec firefox --new-window "${TARGET_URL}" "$@"
else
  exec xdg-open "${TARGET_URL}" "$@"
fi
EOF

# Substitute real target url
sed -i "s|##URL##|${TARGET_URL}|g" "${LAUNCHER_SCRIPT}"
chmod +x "${LAUNCHER_SCRIPT}"

# Create standard freedesktop .desktop entry
DESKTOP_FILE="${APPLICATIONS_DIR}/${APP_ID}.desktop"
cat << EOF > "${DESKTOP_FILE}"
[Desktop Entry]
Version=1.0
Type=Application
Name=${APP_NAME}
GenericName=${APP_GENERIC_NAME}
Comment=${APP_COMMENT}
Exec="${LAUNCHER_SCRIPT}" %u
Icon=${ICON_PATH}
Terminal=false
Categories=Graphics;Photography;Art;AudioVideo;
StartupWMClass=${APP_ID}
Keywords=VanGogh;Cats;Art;Gallery;AI;Masterpiece;
Actions=NewWindow;Gallery;Studio;

[Desktop Action NewWindow]
Name=Новое окно
Exec="${LAUNCHER_SCRIPT}"

[Desktop Action Gallery]
Name=Галерея полотен
Exec="${LAUNCHER_SCRIPT}"

[Desktop Action Studio]
Name=AI Мастерская
Exec="${LAUNCHER_SCRIPT}"
EOF

chmod +x "${DESKTOP_FILE}"

# Also place on Desktop if ~/Desktop directory exists
if [ -d "${DESKTOP_DIR}" ]; then
  cp "${DESKTOP_FILE}" "${DESKTOP_DIR}/${APP_ID}.desktop"
  chmod +x "${DESKTOP_DIR}/${APP_ID}.desktop"
  # In Ubuntu GNOME, allow launching
  if command -v gio &> /dev/null; then
    gio set "${DESKTOP_DIR}/${APP_ID}.desktop" metadata::trusted true 2>/dev/null || true
  fi
fi

# Update desktop icon & mime database caches
if command -v update-desktop-database &> /dev/null; then
  update-desktop-database "${APPLICATIONS_DIR}" 2>/dev/null || true
fi
if command -v gtk-update-icon-cache &> /dev/null; then
  gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" 2>/dev/null || true
fi

echo "✅ Установка завершена!"
echo "✨ Иконка '${APP_NAME}' добавлена в главное меню Ubuntu (Super / Apps) и на Рабочий стол."
echo "🚀 Для запуска введите: ${LAUNCHER_SCRIPT}"
