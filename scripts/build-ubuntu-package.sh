#!/usr/bin/env bash
# ==============================================================================
# Van Gogh CryptoCats - Ubuntu/Debian Package Builder
# Builds:
#  1. vangogh-cats-gallery_1.0.0_all.deb
#  2. vangogh-cats-gallery_1.0.0_linux.tar.gz
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

PACKAGE_NAME="vangogh-cats-gallery"
VERSION="1.0.0"
ARCH="all"
DEB_NAME="${PACKAGE_NAME}_${VERSION}_${ARCH}.deb"
TAR_NAME="${PACKAGE_NAME}_${VERSION}_linux.tar.gz"

BUILD_ROOT="/tmp/vangogh-deb-build"
rm -rf "${BUILD_ROOT}"
mkdir -p "${BUILD_ROOT}"

echo "📦 Сборка инсталляционного пакета Debian/Ubuntu для ${PACKAGE_NAME} v${VERSION}..."

# 1. Directory Structure inside package
INSTALL_BIN="${BUILD_ROOT}/usr/bin"
INSTALL_APPS="${BUILD_ROOT}/usr/share/applications"
INSTALL_ICONS_PNG="${BUILD_ROOT}/usr/share/icons/hicolor/512x512/apps"
INSTALL_ICONS_SVG="${BUILD_ROOT}/usr/share/icons/hicolor/scalable/apps"
INSTALL_SHARE="${BUILD_ROOT}/usr/share/${PACKAGE_NAME}"
INSTALL_DOC="${BUILD_ROOT}/usr/share/doc/${PACKAGE_NAME}"
INSTALL_DEBIAN="${BUILD_ROOT}/DEBIAN"

mkdir -p "${INSTALL_BIN}"
mkdir -p "${INSTALL_APPS}"
mkdir -p "${INSTALL_ICONS_PNG}"
mkdir -p "${INSTALL_ICONS_SVG}"
mkdir -p "${INSTALL_SHARE}"
mkdir -p "${INSTALL_DOC}"
mkdir -p "${INSTALL_DEBIAN}"

# 2. Launcher Binary: /usr/bin/vangogh-cats-gallery
cat << 'EOF' > "${INSTALL_BIN}/${PACKAGE_NAME}"
#!/usr/bin/env bash
# Van Gogh CryptoCats - Native Ubuntu/Linux Launcher
set -e

APP_NAME="Van Gogh CryptoCats"
DEFAULT_URL="https://ais-pre-ypwd3d2freqhamtros5prz-468670053177.europe-west3.run.app"
TARGET_URL="${VANGOGH_URL:-$DEFAULT_URL}"
DATA_DIR="${HOME}/.local/share/vangogh-cats-gallery"
PROFILE_DIR="${DATA_DIR}/profile"

mkdir -p "${DATA_DIR}" "${PROFILE_DIR}"

for arg in "$@"; do
  case $arg in
    --url=*)
      TARGET_URL="${arg#*=}"
      shift
      ;;
    --help|-h)
      echo "$APP_NAME - Art Gallery & AI Post-Impressionist Studio"
      echo ""
      echo "Использование: vangogh-cats-gallery [опции]"
      echo ""
      echo "Опции:"
      echo "  --url=<URL>     Открыть кастомный URL деплоя или локального сервера"
      echo "  --help, -h      Показать данную справку"
      echo "  --version, -v   Показать версию приложения"
      echo ""
      echo "Окружение:"
      echo "  VANGOGH_URL     Переопределение целевого адреса сервиса"
      exit 0
      ;;
    --version|-v)
      echo "$APP_NAME version 1.0.0 (Ubuntu Release Candidate)"
      exit 0
      ;;
  esac
done

# Try modern browsers in order of native application mode (--app) support
if command -v google-chrome &> /dev/null; then
  exec google-chrome --app="${TARGET_URL}" --class="${APP_NAME}" --user-data-dir="${PROFILE_DIR}" "$@"
elif command -v chromium-browser &> /dev/null; then
  exec chromium-browser --app="${TARGET_URL}" --class="${APP_NAME}" --user-data-dir="${PROFILE_DIR}" "$@"
elif command -v chromium &> /dev/null; then
  exec chromium --app="${TARGET_URL}" --class="${APP_NAME}" --user-data-dir="${PROFILE_DIR}" "$@"
elif command -v brave-browser &> /dev/null; then
  exec brave-browser --app="${TARGET_URL}" --class="${APP_NAME}" --user-data-dir="${PROFILE_DIR}" "$@"
elif command -v microsoft-edge &> /dev/null; then
  exec microsoft-edge --app="${TARGET_URL}" --class="${APP_NAME}" --user-data-dir="${PROFILE_DIR}" "$@"
elif command -v firefox &> /dev/null; then
  exec firefox --new-window "${TARGET_URL}" "$@"
elif command -v xdg-open &> /dev/null; then
  exec xdg-open "${TARGET_URL}" "$@"
else
  echo "Ошибка: Не найден подходящий браузер (Chrome, Chromium, Brave или Firefox)." >&2
  exit 1
fi
EOF
chmod 755 "${INSTALL_BIN}/${PACKAGE_NAME}"

# 3. Desktop Entry: /usr/share/applications/vangogh-cats-gallery.desktop
cat << 'EOF' > "${INSTALL_APPS}/${PACKAGE_NAME}.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=Van Gogh CryptoCats
Name[ru]=КриптоКотики Вана Гога
Name[en]=Van Gogh CryptoCats
Name[es]=CriptoGatos de Van Gogh
Name[fr]=CryptoChats de Van Gogh
Name[de]=Van Gogh KryptoKatzen
Name[zh]=梵高加密猫
Name[ja]=ゴッホのクリプトキャット
Name[pt]=CriptoGatos de Van Gogh
Name[ar]=قطط فان جوخ المشفرة
Name[hi]=वैन गॉग क्रिप्टो बिल्लियाँ
GenericName=Art Gallery & AI Studio
GenericName[ru]=Галерея искусств и AI-студия котиков
Comment=Art Gallery & AI Studio of Van Gogh inspired cats
Comment[ru]=Интерактивная галерея шедевров и AI-генератор котиков в стиле Вана Гога
Exec=/usr/bin/vangogh-cats-gallery %u
Icon=vangogh-cats-gallery
Terminal=false
Categories=Graphics;Photography;Art;AudioVideo;
StartupWMClass=vangogh-cats-gallery
Keywords=VanGogh;Cats;Art;Gallery;AI;Masterpiece;Impasto;P2P;
Actions=NewWindow;Gallery;Studio;P2PHub;

[Desktop Action NewWindow]
Name=New Window
Name[ru]=Новое окно
Exec=/usr/bin/vangogh-cats-gallery

[Desktop Action Gallery]
Name=Gallery
Name[ru]=Галерея полотен
Exec=/usr/bin/vangogh-cats-gallery

[Desktop Action Studio]
Name=AI Studio
Name[ru]=AI Мастерская
Exec=/usr/bin/vangogh-cats-gallery

[Desktop Action P2PHub]
Name=P2P Network Hub
Name[ru]=P2P Сеть и Хранилище
Exec=/usr/bin/vangogh-cats-gallery
EOF
chmod 644 "${INSTALL_APPS}/${PACKAGE_NAME}.desktop"

# 4. Icons
cp "${ROOT_DIR}/public/pwa-512x512.png" "${INSTALL_ICONS_PNG}/${PACKAGE_NAME}.png"
chmod 644 "${INSTALL_ICONS_PNG}/${PACKAGE_NAME}.png"

cp "${ROOT_DIR}/public/icon.svg" "${INSTALL_ICONS_SVG}/${PACKAGE_NAME}.svg"
chmod 644 "${INSTALL_ICONS_SVG}/${PACKAGE_NAME}.svg"

# 5. Share files & docs
cat << EOF > "${INSTALL_SHARE}/package-info.json"
{
  "name": "vangogh-cats-gallery",
  "version": "${VERSION}",
  "release": "1.0.0-rc",
  "platform": "Ubuntu Linux (Debian-based)",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "author": "Vincent & CryptoCats Guild",
  "description": "Interactive Art Gallery & AI Post-Impressionist Cats Generator with P2P Swarm & Merkle Audit"
}
EOF
chmod 644 "${INSTALL_SHARE}/package-info.json"

cat << 'EOF' > "${INSTALL_DOC}/copyright"
Format: https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
Upstream-Name: vangogh-cats-gallery
Source: https://ais-pre-ypwd3d2freqhamtros5prz-468670053177.europe-west3.run.app

Files: *
Copyright: 2026 Vincent & CryptoCats Guild <yusyajedusya@gmail.com>
License: MIT
EOF
chmod 644 "${INSTALL_DOC}/copyright"

cat << 'EOF' > "${INSTALL_DOC}/README.Debian"
Van Gogh CryptoCats for Debian/Ubuntu
=====================================

Приложение интегрировано в стандартное меню приложений Ubuntu (Super / Меню Приложений).
Для запуска введите в терминале:
    vangogh-cats-gallery

Или используйте значок «КриптоКотики Вана Гога» в Dash/Dock.
EOF
chmod 644 "${INSTALL_DOC}/README.Debian"

# 6. Debian Control Files
INSTALLED_SIZE=$(du -sk "${BUILD_ROOT}" | cut -f1)

cat << EOF > "${INSTALL_DEBIAN}/control"
Package: ${PACKAGE_NAME}
Version: ${VERSION}
Section: graphics
Priority: optional
Architecture: ${ARCH}
Installed-Size: ${INSTALLED_SIZE}
Maintainer: Vincent & CryptoCats Guild <yusyajedusya@gmail.com>
Depends: bash (>= 4.0), curl
Recommends: chromium-browser | google-chrome-stable | chromium | brave-browser | firefox
Homepage: https://ais-pre-ypwd3d2freqhamtros5prz-468670053177.europe-west3.run.app
Description: Van Gogh CryptoCats - Art Gallery & AI Post-Impressionist Studio
 Интерактивная галерея шедевров и AI-генератор котиков в стиле Вана Гога.
 Включает децентрализованную P2P-сеть, резервное копирование .vangoghcat,
 проверку Merkle Root, систему Web of Trust и зашифрованный чат.
EOF
chmod 644 "${INSTALL_DEBIAN}/control"

cat << 'EOF' > "${INSTALL_DEBIAN}/postinst"
#!/bin/sh
set -e

if [ "$1" = "configure" ]; then
    if which update-desktop-database >/dev/null 2>&1; then
        update-desktop-database -q /usr/share/applications || true
    fi
    if which gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
    fi
fi
exit 0
EOF
chmod 755 "${INSTALL_DEBIAN}/postinst"

cat << 'EOF' > "${INSTALL_DEBIAN}/postrm"
#!/bin/sh
set -e

if [ "$1" = "remove" ] || [ "$1" = "purge" ]; then
    if which update-desktop-database >/dev/null 2>&1; then
        update-desktop-database -q /usr/share/applications || true
    fi
    if which gtk-update-icon-cache >/dev/null 2>&1; then
        gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
    fi
fi
exit 0
EOF
chmod 755 "${INSTALL_DEBIAN}/postrm"

# 7. Build .deb package using dpkg-deb
mkdir -p "${ROOT_DIR}/public"
dpkg-deb --build "${BUILD_ROOT}" "${ROOT_DIR}/public/${DEB_NAME}"

# Also make a generic symlink or copy for easy static link download
cp -f "${ROOT_DIR}/public/${DEB_NAME}" "${ROOT_DIR}/public/vangogh-cats-gallery_latest_all.deb"

# 8. Build standalone tar.gz for portable install
TAR_DIR="/tmp/vangogh-tar-build"
rm -rf "${TAR_DIR}"
mkdir -p "${TAR_DIR}/${PACKAGE_NAME}"

cp "${BUILD_ROOT}/usr/bin/${PACKAGE_NAME}" "${TAR_DIR}/${PACKAGE_NAME}/launch.sh"
cp "${BUILD_ROOT}/usr/share/applications/${PACKAGE_NAME}.desktop" "${TAR_DIR}/${PACKAGE_NAME}/"
cp "${BUILD_ROOT}/usr/share/icons/hicolor/512x512/apps/${PACKAGE_NAME}.png" "${TAR_DIR}/${PACKAGE_NAME}/"

cat << 'EOF' > "${TAR_DIR}/${PACKAGE_NAME}/install.sh"
#!/usr/bin/env bash
set -e
echo "Установка Van Gogh CryptoCats для текущего пользователя..."
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p ~/.local/bin ~/.local/share/applications ~/.local/share/icons/hicolor/512x512/apps

cp "${DIR}/launch.sh" ~/.local/bin/vangogh-cats-gallery
chmod +x ~/.local/bin/vangogh-cats-gallery

cp "${DIR}/vangogh-cats-gallery.png" ~/.local/share/icons/hicolor/512x512/apps/
cp "${DIR}/vangogh-cats-gallery.desktop" ~/.local/share/applications/
sed -i "s|/usr/bin/vangogh-cats-gallery|${HOME}/.local/bin/vangogh-cats-gallery|g" ~/.local/share/applications/vangogh-cats-gallery.desktop

if which update-desktop-database >/dev/null 2>&1; then
  update-desktop-database ~/.local/share/applications 2>/dev/null || true
fi
if which gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor 2>/dev/null || true
fi

echo "Готово! Приложение установлено в ~/.local/bin/vangogh-cats-gallery"
EOF
chmod +x "${TAR_DIR}/${PACKAGE_NAME}/install.sh"

cat << 'EOF' > "${TAR_DIR}/${PACKAGE_NAME}/README.txt"
Van Gogh CryptoCats - Portable Linux Edition
===========================================
1. Для установки в локальный профиль запустите:
   ./install.sh

2. Для запуска без установки запустите:
   ./launch.sh
EOF

tar -czf "${ROOT_DIR}/public/${TAR_NAME}" -C "${TAR_DIR}" "${PACKAGE_NAME}"
cp -f "${ROOT_DIR}/public/${TAR_NAME}" "${ROOT_DIR}/public/vangogh-cats-gallery_latest_linux.tar.gz"

# Copy to dist if dist exists
if [ -d "${ROOT_DIR}/dist" ]; then
  cp -f "${ROOT_DIR}/public/${DEB_NAME}" "${ROOT_DIR}/dist/"
  cp -f "${ROOT_DIR}/public/vangogh-cats-gallery_latest_all.deb" "${ROOT_DIR}/dist/"
  cp -f "${ROOT_DIR}/public/${TAR_NAME}" "${ROOT_DIR}/dist/"
  cp -f "${ROOT_DIR}/public/vangogh-cats-gallery_latest_linux.tar.gz" "${ROOT_DIR}/dist/"
fi

echo "✅ Пакеты успешно собраны:"
echo "   - ${ROOT_DIR}/public/${DEB_NAME} ($(du -h "${ROOT_DIR}/public/${DEB_NAME}" | cut -f1))"
echo "   - ${ROOT_DIR}/public/${TAR_NAME} ($(du -h "${ROOT_DIR}/public/${TAR_NAME}" | cut -f1))"
