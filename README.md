# 🌻 Van Gogh CryptoCats Gallery & P2P Studio

Интерактивная галерея и AI-студия постимпрессионизма с защищённым P2P-обменом по WebRTC, криптографическим обменом ключами ECDH P-256 и локальным профилем BIP-39.

---

## 🏛️ Архитектура и модель безопасности

Приложение построено по гибридной схеме **Local-First + Authenticated AI Proxy**:

1. **Сервер (`server.ts`, Express + WebSocket)**
   - **Аутентификация платных API-маршрутов**: `/api/generate-image`, `/api/edit-image`, `/api/curator-chat` и ветка Gemini TTS (`/api/tts`) требуют валидный **Firebase ID Token** (`Authorization: Bearer <token>`), проверяемый на сервере по актуальным публичным X.509-сертификатам Google (RS256, `node:crypto`).
   - **Rate Limiting & Заголовки безопасности**: настроены `helmet`, строгий CORS по `ALLOWED_ORIGIN` (без wildcard `*` для приватных маршрутов), раздельные лимиты JSON-тела (`100kb` для обычных и `12mb` для медиа-запросов) и `express-rate-limit`.
   - **Валидация входных данных (Zod)**: проверка размеров base64-изображений (≤ 4 МБ декодированных байт), allowlist MIME (`image/jpeg`, `image/png`, `image/webp`) и серверная фильтрация **Cat Sanctity Validator** (включая опциональную мягкую проверку изображений через Gemini Vision при `ENABLE_VISION_CAT_CHECK=true`).
   - **Без серверной галереи в памяти**: сервер не хранит пользовательские картины или seed-фразы в ОЗУ (`GET /api/health` и `/api/ai-status` возвращают только статус доступности и настроенные модели).
   - **Безопасность LAN-эндпоинта**: `/api/network/lan-info` доступен только в режиме разработки и возвращает `404` при `NODE_ENV=production`.

2. **Профили и шифрованные архивы (BIP-39 + Web Crypto)**
   - Генерация и восстановление локальных профилей по 12-словной мнемонике **BIP-39** с выводом публичного ID через SHA-256 с доменом.
   - **Нулевое хранение открытых seed-фраз**: сид-фраза показывается пользователю один раз при создании, никогда не сохраняется в `localStorage` / `IndexedDB` и не включается в публичный `.catpack.json`.
   - Пин-коды хешируются через **PBKDF2-SHA256 (100 000 итераций + случайная соль)**.
   - Приватные резервные архивы `.catpack.enc.json` шифруются пользовательской парольной фразой (**PBKDF2 600 000 итераций + AES-GCM-256**).

3. **P2P-сеть, WebRTC и криптография «Van Gogh Whispers»**
   - **Авторизованный сигналинг и WebSocket-реле (`/ws/p2p` и `/api/p2p/*`)**: регистрация пира выдаёт одноразовый серверный `sessionToken`, защищает от перехвата активного `peerId` (`409 Conflict`), ограничивает размер очереди сигналов и вводит TTL.
   - **Реальный WebRTC DataChannel**: потоковая передача картин чанками по 48 КБ с лимитом размера (до 512 чанков / 8 МБ), проверкой SHA-256 каждого чанка и итогового `contentHash`, Zod-валидацией входящих кадров и привязкой `senderProfile.id` к аутентифицированному `peerId` соединения.
   - **Настоящий E2EE v2 (`ECDH P-256 + HKDF-SHA256 + AES-GCM-256 c AAD`)**: постоянные пары ключей хранятся в `IndexedDB`, ключами обмениваются при WebRTC-рукопожатии, а собеседники могут сверить симметричный **Safety Number**.
   - **Web of Trust (`ECDSA P-256`)**: подпись и криптографическая проверка сертификатов доверия (`verifyEndorsementSignature`) на базе постоянной ключевой пары ECDSA P-256.

4. **Честное разделение реальных и демонстрационных механик**
   - **Реальные функции**: генерация/редактирование Gemini AI (через Firebase Auth), прямая передача файлов по WebRTC DataChannel, E2EE-конверты ECDH P-256, ECDSA-подписи отзывов, зашифрованный экспорт `.catpack.enc.json`, клиентский и серверный Cat Sanctity Validator, Edge-TTS / SpeechSynthesis.
   - **Локальные / демо-функции** (явно помечены в интерфейсе): встроенные куратор-боты (`Тео Ван Гог`, `Арльский Мурлыка` — без E2EE), локальная коллегия аудиторов 2:1 на устройстве, локальная книга отзывов в `localStorage`, локальная симуляция Merkle-роя (в дополнение к вкладке живого WebRTC-стриминга) и бесплатный локальный переключатель режима без рекламы.

---

## ⚙️ Переменные окружения (`.env.example`)

| Переменная | Назначение | По умолчанию |
|---|---|---|
| `PORT` | HTTP/WS порт сервера | `3000` |
| `ALLOWED_ORIGIN` | Разрешённый origin(ы) для CORS (через запятую) | localhost + loopback |
| `FIREBASE_PROJECT_ID` | ID проекта Firebase для проверки ID-токенов | значение из конфига апплета |
| `GEMINI_API_KEY` | Серверный ключ Gemini API | — |
| `GEMINI_IMAGE_MODEL` | Модель генерации изображений | `gemini-3.1-flash-image-preview` |
| `GEMINI_IMAGE_MODEL_FALLBACK` | Резервная модель изображений | `gemini-2.5-flash-image` |
| `GEMINI_TEXT_MODEL` | Текстовая модель кураторского чата | `gemini-2.5-flash` |
| `GEMINI_TTS_MODEL` | Модель синтеза речи Gemini | `gemini-2.5-flash-preview-tts` |
| `ENABLE_VISION_CAT_CHECK` | Мягкая серверная Vision-проверка котов на сгенерированных холстах | `false` |

---

## 🚀 Команды разработки и проверки

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки (Express + WebSocket + Vite на порту 3000)
npm run dev

# Модульные тесты безопасности, криптографии и фильтрации
npm test

# Проверка типов TypeScript
npm run lint

# Проверка правил безопасности Firestore
npx eslint firestore.rules

# Production-сборка (Vite + esbuild CJS сервер)
npm run build

# Запуск production-сервера
NODE_ENV=production npm start

# Опциональная сборка локального Debian/tar.gz пакета для Ubuntu (в dist/packages/)
APP_URL="http://localhost:3000" npm run package:ubuntu
```
