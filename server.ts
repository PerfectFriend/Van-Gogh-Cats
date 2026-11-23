import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { z } from 'zod';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { Communicate } from 'edge-tts-universal';
import { createServer as createViteServer } from 'vite';
import { VAN_GOGH_STYLE_PRESETS } from './src/data/stylePresets';
import { Artwork } from './src/types';
import { validateCatSanctity } from './src/utils/catSanctity';

// Prevent tsx's global __dirname = '.' from breaking createRequire in vite plugins (e.g. vite-plugin-pwa)
if ((globalThis as Record<string, unknown>).__dirname === '.') {
  delete (globalThis as Record<string, unknown>).__dirname;
}

dotenv.config();

const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1';
const GEMINI_FLASH_IMAGE_MODEL = process.env.GEMINI_FLASH_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';
const GEMINI_PRO_IMAGE_MODEL = process.env.GEMINI_PRO_IMAGE_MODEL || 'gemini-3-pro-image';
const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts';
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-4-hydrogen';

function resolveFirebaseProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID) {
    return process.env.FIREBASE_PROJECT_ID;
  }
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.projectId === 'string' && parsed.projectId.length > 0) {
      return parsed.projectId;
    }
  } catch (err) {
    console.warn('[Firebase Auth Config] Could not read firebase-applet-config.json:', (err as Error).message);
  }
  return 'gen-lang-client-0280046328';
}

const FIREBASE_PROJECT_ID = resolveFirebaseProjectId();
const FIREBASE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

interface CachedCerts {
  certs: Record<string, string>;
  expiresAt: number;
  fetchedAt: number;
}
let firebaseCertsCache: CachedCerts | null = null;

async function fetchGoogleX509Certs(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && firebaseCertsCache && now < firebaseCertsCache.expiresAt) {
    return firebaseCertsCache.certs;
  }

  const res = await fetch(FIREBASE_CERTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase public certificates: HTTP ${res.status}`);
  }
  const certs = (await res.json()) as Record<string, string>;
  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Math.max(60, parseInt(maxAgeMatch[1], 10)) : 3600;

  firebaseCertsCache = {
    certs,
    fetchedAt: now,
    expiresAt: now + maxAgeSec * 1000,
  };
  return certs;
}

interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  name?: string;
}

async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8')) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) {
      return null;
    }

    let certs = await fetchGoogleX509Certs(false);
    let certPem = certs[header.kid];
    if (!certPem) {
      const canForce = !firebaseCertsCache || Date.now() - firebaseCertsCache.fetchedAt > 60_000;
      if (canForce) {
        certs = await fetchGoogleX509Certs(true);
        certPem = certs[header.kid];
      }
    }
    if (!certPem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    verifier.end();
    const isValidSig = verifier.verify(certPem, Buffer.from(signatureB64, 'base64url'));
    if (!isValidSig) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      auth_time?: number;
      email?: string;
      name?: string;
    };

    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.aud !== FIREBASE_PROJECT_ID) return null;
    if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) return null;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 128) return null;
    if (typeof payload.exp !== 'number' || payload.exp <= nowSec) return null;
    if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) return null;
    if (typeof payload.auth_time !== 'number' || payload.auth_time > nowSec + 300) return null;

    return {
      uid: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch (err) {
    console.warn('[Firebase Auth Verify]', (err as Error).message);
    return null;
  }
}

interface AuthenticatedRequest extends Request {
  firebaseUser?: VerifiedFirebaseUser;
  p2pPeerId?: string;
}

async function extractBearerFirebaseUser(req: Request): Promise<VerifiedFirebaseUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || token.length > 8192) return null;
  return verifyFirebaseIdToken(token);
}

async function requireFirebaseUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = await extractBearerFirebaseUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'AUTH_REQUIRED',
      errorCode: 'AUTH_REQUIRED',
      message: 'Требуется авторизация Google (Firebase Auth) для выполнения AI-запроса.',
    });
  }
  req.firebaseUser = user;
  next();
}

// Lazy initialization of GoogleGenAI
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

interface ModelAvailabilityStatus {
  checked: boolean;
  checkedAt?: number;
  availableCount?: number;
  missingModels?: string[];
  error?: string;
}

let modelAvailabilityStatus: ModelAvailabilityStatus = { checked: false };

async function verifyConfiguredGeminiModels(): Promise<void> {
  if (!process.env.GEMINI_API_KEY) {
    modelAvailabilityStatus = {
      checked: false,
      error: 'GEMINI_API_KEY not configured',
    };
    return;
  }

  try {
    const ai = getAI();
    const available = new Set<string>();
    const pager = await ai.models.list();
    for await (const m of pager) {
      if (m.name) {
        available.add(m.name.replace(/^models\//, ''));
      }
    }

    const configured = [
      GEMINI_IMAGE_MODEL,
      GEMINI_FLASH_IMAGE_MODEL,
      GEMINI_PRO_IMAGE_MODEL,
      GEMINI_TTS_MODEL,
      GEMINI_TEXT_MODEL,
    ];
    const missingModels = configured.filter(id => !available.has(id));
    if (missingModels.length > 0) {
      console.warn('[Gemini Startup Probe] Configured models not listed by ai.models.list():', missingModels.join(', '));
    }
    modelAvailabilityStatus = {
      checked: true,
      checkedAt: Date.now(),
      availableCount: available.size,
      missingModels,
    };
  } catch (err) {
    console.warn('[Gemini Startup Probe] Could not verify model list:', (err as Error).message);
    modelAvailabilityStatus = {
      checked: true,
      checkedAt: Date.now(),
      error: (err as Error).message.slice(0, 180),
    };
  }
}

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SINGLE_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TTS_VOICES = [
  'ru-RU-DmitryNeural',
  'ru-RU-SvetlanaNeural',
  'en-US-ChristopherNeural',
  'en-US-JennyNeural',
  'gemini-charon',
  'gemini-aoede',
  'gemini-fenrir',
] as const;

const GenerateImageSchema = z.object({
  prompt: z.string().trim().min(1, 'Промпт обязателен').max(500, 'Промпт не длиннее 500 символов'),
  model: z.string().max(80).optional(),
  aspectRatio: z.enum(['1:1', '3:4', '4:3', '9:16', '16:9', '1:4', '4:1']).optional().default('1:1'),
  imageSize: z.enum(['1K', '2K', '4K']).optional().default('1K'),
  stylePresetId: z.string().max(64).optional().default('starry_night'),
  customStylePrompt: z.string().max(400).optional().default(''),
  referenceImages: z
    .array(
      z.object({
        dataUrl: z.string().min(10).max(6_500_000),
        mimeType: z.string().max(40).optional(),
      })
    )
    .max(4)
    .optional()
    .default([]),
});

const EditImageSchema = z.object({
  imageBase64: z.string().min(10).max(6_500_000),
  mimeType: z.string().max(40).optional().default('image/png'),
  prompt: z.string().trim().min(1).max(500),
  model: z.string().max(80).optional(),
  imageSize: z.enum(['1K', '2K', '4K']).optional().default('1K'),
});

const TtsRequestSchema = z.object({
  text: z.string().trim().min(1).max(1200),
  voice: z.enum(ALLOWED_TTS_VOICES).optional().default('ru-RU-DmitryNeural'),
  rate: z.string().max(16).optional().default('+0%'),
  pitch: z.string().max(16).optional().default('+0Hz'),
});

const CuratorChatSchema = z.object({
  message: z.string().trim().min(1).max(800),
  recipientPeerId: z.string().max(80).optional().default('peer_theo_vangogh'),
  senderName: z.string().max(80).optional().default('Винсент'),
});

const EcP256JwkSchema = z.object({
  kty: z.literal('EC'),
  crv: z.literal('P-256'),
  x: z.string().min(16).max(128),
  y: z.string().min(16).max(128),
  ext: z.boolean().optional(),
});

const P2PRegisterSchema = z.object({
  peerId: z.string().regex(/^[a-zA-Z0-9_-]{3,80}$/, 'Некорректный формат peerId'),
  name: z.string().trim().min(1).max(80),
  avatarColor: z.string().max(80).optional(),
  artworkCount: z.number().int().min(0).max(10000).optional().default(0),
  ecdhPublicKeyJwk: EcP256JwkSchema.optional(),
  ecdsaPublicKeyJwk: EcP256JwkSchema.optional(),
});

const P2PSignalSendSchema = z.object({
  toPeerId: z.string().regex(/^[a-zA-Z0-9_-]{3,80}$/),
  signalType: z.enum(['OFFER', 'ANSWER', 'ICE']),
  payload: z.unknown(),
});

function parseValidatedBase64Image(
  dataUrlOrBase64: string,
  fallbackMime?: string
): { mimeType: string; data: string } | null {
  const match = dataUrlOrBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  const mimeType = match ? match[1] : fallbackMime || '';
  const data = match ? match[2] : dataUrlOrBase64;

  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return null;
  }
  const decodedBytes = Buffer.from(data, 'base64').byteLength;
  if (decodedBytes === 0 || decodedBytes > MAX_SINGLE_IMAGE_BYTES) {
    return null;
  }
  return { mimeType, data };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = http.createServer(app);

  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));

  // Explicit CORS policy (never wildcard *)
  const configuredAllowedOrigins = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().split(',')[0].trim();
      const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').toString().split(',')[0].trim();
      const selfOrigin = host ? `${proto}://${host}` : '';
      const isAllowed =
        configuredAllowedOrigins.includes(origin) ||
        (selfOrigin && origin === selfOrigin) ||
        origin === `http://localhost:${PORT}` ||
        origin === `http://127.0.0.1:${PORT}`;

      res.setHeader('Vary', 'Origin');
      if (isAllowed) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      } else if (req.method === 'OPTIONS') {
        return res.status(403).json({ error: 'CORS_ORIGIN_FORBIDDEN' });
      }
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Separate JSON limits: 100 KB default for small endpoints, 12 MB strictly for AI image endpoints
  const smallJson = express.json({ limit: '100kb' });
  const mediaJson = express.json({ limit: '12mb' });

  const aiImageLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const uid = (req as AuthenticatedRequest).firebaseUser?.uid;
      return uid ? `uid:${uid}` : ipKeyGenerator(req.ip || '127.0.0.1');
    },
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      message: 'Слишком много запросов на генерацию картин. Подождите несколько минут.',
    },
  });

  const curatorChatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const uid = (req as AuthenticatedRequest).firebaseUser?.uid;
      return uid ? `uid:${uid}` : ipKeyGenerator(req.ip || '127.0.0.1');
    },
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Превышен лимит сообщений куратору. Попробуйте чуть позже.',
    },
  });

  const ttsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Превышен лимит запросов синтеза речи.',
    },
  });

  const p2pLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: 'P2P_RATE_LIMIT_EXCEEDED',
    },
  });

  // Non-blocking startup probe of configured Gemini model names
  void verifyConfiguredGeminiModels();

  // API Route: Health & capability summary (no user artwork count or secrets)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasServerKey: Boolean(process.env.GEMINI_API_KEY),
      modelStatus: modelAvailabilityStatus,
    });
  });

  // API Route: AI engine status (never exposes key value)
  app.get('/api/ai-status', (_req, res) => {
    res.json({
      success: true,
      hasServerKey: Boolean(process.env.GEMINI_API_KEY),
      defaultModel: GEMINI_IMAGE_MODEL,
      supportedModels: [GEMINI_IMAGE_MODEL, GEMINI_FLASH_IMAGE_MODEL, GEMINI_PRO_IMAGE_MODEL],
      modelStatus: modelAvailabilityStatus,
    });
  });

  function pcmToWav(pcmData: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
    const header = Buffer.alloc(44);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = pcmData.length;
    const chunkSize = 36 + dataSize;
    header.write('RIFF', 0);
    header.writeUInt32LE(chunkSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    return Buffer.concat([header, pcmData]);
  }

  // API Route: Neural Audio Guide TTS (Gemini voices require Firebase auth; Edge Neural rate-limited with strict allowlist)
  app.post('/api/tts', smallJson, ttsLimiter, async (req, res) => {
    try {
      const parsed = TtsRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_TTS_PARAMS',
          message: parsed.error.issues[0]?.message || 'Некорректные параметры озвучивания.',
        });
      }

      const { text: cleanText, voice, rate, pitch } = parsed.data;
      const isGeminiVoice = voice.startsWith('gemini-');

      if (isGeminiVoice) {
        const user = await extractBearerFirebaseUser(req);
        if (!user) {
          return res.status(401).json({
            success: false,
            error: 'AUTH_REQUIRED',
            message: 'Для генерации голоса Gemini требуется вход через Google.',
          });
        }

        try {
          const ai = getAI();
          const geminiVoiceMap: Record<string, string> = {
            'gemini-aoede': 'Aoede',
            'gemini-charon': 'Charon',
            'gemini-fenrir': 'Fenrir',
          };
          const prebuiltVoiceName = geminiVoiceMap[voice] || 'Charon';

          const response = await ai.models.generateContent({
            model: GEMINI_TTS_MODEL,
            contents: cleanText,
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: prebuiltVoiceName,
                  },
                },
              },
            },
          });

          const pcmBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (pcmBase64) {
            const pcmBuffer = Buffer.from(pcmBase64, 'base64');
            const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
            return res.json({
              success: true,
              engine: 'gemini-tts',
              voice: prebuiltVoiceName,
              mimeType: 'audio/wav',
              audioDataUrl: `data:audio/wav;base64,${wavBuffer.toString('base64')}`,
            });
          }
        } catch (geminiErr: any) {
          console.warn('[TTS] Gemini Voice fallback to Voicebox Neural:', geminiErr?.message?.slice(0, 120));
        }
      }

      const edgeVoice = isGeminiVoice ? 'ru-RU-DmitryNeural' : voice;
      const comm = new Communicate(cleanText, {
        voice: edgeVoice,
        rate: rate || '+0%',
        pitch: pitch || '+0Hz',
      });
      const chunks: Buffer[] = [];

      for await (const chunk of comm.stream()) {
        if (chunk.type === 'audio' && chunk.data) {
          chunks.push(chunk.data);
        }
      }

      if (chunks.length === 0) {
        throw new Error('No audio chunks received from neural speech stream');
      }

      const audioBuffer = Buffer.concat(chunks);
      return res.json({
        success: true,
        engine: 'voicebox-neural',
        voice: edgeVoice,
        mimeType: 'audio/mpeg',
        audioDataUrl: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`,
      });
    } catch (err: any) {
      console.error('[TTS Route Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'TTS_SYNTHESIS_FAILED',
        message: err?.message || 'Не удалось синтезировать голос аудиогида',
      });
    }
  });

  function normalizeImageModel(rawModel?: string): string {
    if (rawModel === GEMINI_FLASH_IMAGE_MODEL || rawModel === 'gemini-3.1-flash-lite-image') {
      return GEMINI_FLASH_IMAGE_MODEL;
    }
    if (rawModel === GEMINI_PRO_IMAGE_MODEL || rawModel === 'gemini-3-pro-image') {
      return GEMINI_PRO_IMAGE_MODEL;
    }
    return GEMINI_IMAGE_MODEL;
  }

  function formatGeminiImageError(err: any) {
    const rawMsg = err?.message || String(err || 'Gemini API error');
    const statusNum = Number(err?.status || err?.code || 0);
    const isMissingKey = rawMsg.includes('GEMINI_API_KEY');
    const isQuotaOrBilling =
      statusNum === 429 ||
      statusNum === 402 ||
      statusNum === 403 ||
      /quota|billing|RESOURCE_EXHAUSTED|PERMISSION_DENIED|billed|paid/i.test(rawMsg);
    const isInvalidKey = statusNum === 400 && /API_KEY_INVALID|API key not valid/i.test(rawMsg);

    if (isMissingKey) {
      return {
        httpStatus: 400,
        errorCode: 'GEMINI_KEY_MISSING',
        billingRequired: true,
        message: 'Не подключён серверный ключ Gemini (Settings > Secrets).',
      };
    }
    if (isInvalidKey) {
      return {
        httpStatus: 400,
        errorCode: 'GEMINI_KEY_INVALID',
        billingRequired: true,
        message: 'Серверный ключ Gemini отклонён как недействительный. Проверьте ключ в Settings > Secrets.',
      };
    }
    if (isQuotaOrBilling) {
      const isFreeTierZero = /limit:\s*0|Free Tier/i.test(rawMsg);
      return {
        httpStatus: statusNum === 429 ? 429 : 403,
        errorCode: 'GEMINI_BILLING_OR_QUOTA',
        billingRequired: true,
        message: isFreeTierZero
          ? 'Для моделей Nano Banana 2 бесплатный лимит равен 0. Подключите платный биллинг-ключ Gemini в настройках AI Studio (Settings > Secrets).'
          : 'Превышена квота или требуется активный биллинг Google Cloud на ключе Gemini (Settings > Secrets).',
      };
    }
    return {
      httpStatus: statusNum >= 400 && statusNum < 600 ? statusNum : 500,
      errorCode: 'GEMINI_GENERATION_FAILED',
      billingRequired: false,
      message: rawMsg.slice(0, 260),
    };
  }

  async function softVerifyGeneratedImageHasCat(ai: GoogleGenAI, base64Data: string, mimeType: string): Promise<boolean> {
    if (process.env.ENABLE_VISION_CAT_CHECK === 'false') {
      return true;
    }
    try {
      const checkRes = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: 'Answer strictly YES or NO: does this artwork depict at least one cat, kitten, or feline?' },
          ],
        },
      });
      const answer = (checkRes?.text || '').trim().toUpperCase();
      if (answer.startsWith('NO')) {
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Vision Cat Sanctity Soft Check]:', (err as Error).message);
      return true;
    }
  }

  // API Route: Generate new Van Gogh / custom-style cat image (Authenticated + Rate-limited + Zod + Cat Sanctity)
  app.post('/api/generate-image', mediaJson, requireFirebaseUser, aiImageLimiter, async (req: AuthenticatedRequest, res) => {
    const parsed = GenerateImageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_PARAMS',
        message: parsed.error.issues[0]?.message || 'Некорректные параметры генерации.',
      });
    }

    const {
      prompt,
      model,
      aspectRatio,
      imageSize,
      stylePresetId,
      customStylePrompt,
      referenceImages,
    } = parsed.data;

    const validRefs: Array<{ mimeType: string; data: string }> = [];
    for (const ref of referenceImages) {
      const cleanRef = parseValidatedBase64Image(ref.dataUrl, ref.mimeType);
      if (!cleanRef) {
        return res.status(400).json({
          success: false,
          errorCode: 'INVALID_REFERENCE_IMAGE',
          message: 'Допустимы только JPEG, PNG или WEBP изображения размером до 4 МБ каждое.',
        });
      }
      validRefs.push(cleanRef);
    }

    // Enforce Cat Sanctity on server when generating from text prompt alone
    if (validRefs.length === 0) {
      const sanctity = validateCatSanctity(prompt);
      if (!sanctity.isCat) {
        return res.status(422).json({
          success: false,
          errorCode: 'NOT_A_CAT',
          message: sanctity.reason,
        });
      }
    }

    const requestedModel = normalizeImageModel(model);
    const stylePreset = VAN_GOGH_STYLE_PRESETS.find((p) => p.id === stylePresetId) || VAN_GOGH_STYLE_PRESETS[0];
    const hasCustomStyle = customStylePrompt.trim().length > 0;
    const styleDirective = hasCustomStyle
      ? `in this exact custom artistic style described by the user: "${customStylePrompt.trim()}". Maintain expressive painterly mastery and cohesive palette across the entire artwork.`
      : `${stylePreset.promptModifier}. Ensure authentic post-impressionist brushstroke texture, vibrant colors, and expressive emotional mood.`;

    const refInstruction =
      validRefs.length > 0
        ? `Using the ${validRefs.length} reference photo(s) of the user's real cat(s), faithfully preserve each cat's exact fur colors, markings, face shape, ear shape, and eye color while transforming the scene into a fine-art painting. `
        : '';

    const enrichedPrompt = `${refInstruction}${prompt}. ${styleDirective}`;

    const parts: any[] = validRefs.map(ref => ({
      inlineData: {
        data: ref.data,
        mimeType: ref.mimeType,
      },
    }));
    parts.push({ text: enrichedPrompt });

    const supportsExtendedConfig =
      requestedModel === GEMINI_IMAGE_MODEL || requestedModel === GEMINI_PRO_IMAGE_MODEL;
    const allowedRatios = supportsExtendedConfig
      ? ['1:1', '3:4', '4:3', '9:16', '16:9', '1:4', '4:1']
      : ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const safeRatio = allowedRatios.includes(aspectRatio) ? aspectRatio : '1:1';
    const safeSize = imageSize === '2K' || imageSize === '4K' ? imageSize : '1K';

    const imageConfig: Record<string, string> = {
      aspectRatio: safeRatio,
    };
    if (supportsExtendedConfig) {
      imageConfig.imageSize = safeSize;
    }

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: { parts },
        config: {
          imageConfig,
        },
      });

      let generatedBase64: string | null = null;
      let generatedMime = 'image/png';
      let textNote = '';
      const outParts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of outParts) {
        if (part.inlineData?.data) {
          generatedMime = part.inlineData.mimeType ?? 'image/png';
          generatedBase64 = part.inlineData.data;
        } else if (part.text) {
          textNote += part.text + ' ';
        }
      }

      if (!generatedBase64) {
        return res.status(502).json({
          success: false,
          errorCode: 'NO_IMAGE_PART',
          billingRequired: false,
          message: textNote.trim() || `Модель ${requestedModel} не вернула изображение. Попробуйте уточнить описание.`,
        });
      }

      const hasCat = await softVerifyGeneratedImageHasCat(ai, generatedBase64, generatedMime);
      if (!hasCat) {
        return res.status(422).json({
          success: false,
          errorCode: 'NOT_A_CAT',
          message: 'На сгенерированном холсте не обнаружен кот. Уточните описание, чтобы котик был главным героем!',
        });
      }

      const generatedImage = `data:${generatedMime};base64,${generatedBase64}`;
      const displayStyleName = hasCustomStyle
        ? `Свой стиль: ${customStylePrompt.trim().slice(0, 40)}`
        : stylePreset.name;

      const newArtwork: Artwork = {
        id: `vg_${crypto.randomUUID()}`,
        title: prompt.length > 40 ? prompt.slice(0, 37) + '...' : prompt,
        titleEn: 'Nano Banana 2 Cat Creation',
        imageUrl: generatedImage,
        prompt,
        style: displayStyleName,
        year: `${requestedModel}, ${new Date().getFullYear()}`,
        description:
          textNote.trim() ||
          `Создано моделью ${requestedModel}${validRefs.length > 0 ? ` по ${validRefs.length} фото вашего котика` : ''} (${displayStyleName}).`,
        palette: stylePreset.colors.map((hex, i) => ({ hex, name: `Оттенок #${i + 1}` })),
        brushstrokeNote: hasCustomStyle
          ? `Авторский стиль (${requestedModel}, ${safeSize}).`
          : `Экспрессивный импасто (${requestedModel}, ${safeSize}).`,
        aspectRatio: safeRatio as Artwork['aspectRatio'],
        createdAt: Date.now(),
        isUserCreated: true,
        modelUsed: requestedModel,
        likes: 1,
      };

      return res.json({
        success: true,
        artwork: newArtwork,
        promptUsed: enrichedPrompt,
        modelUsed: requestedModel,
      });
    } catch (modelErr: any) {
      const formatted = formatGeminiImageError(modelErr);
      console.warn(`[Image Studio ${requestedModel}] ${formatted.errorCode}: ${formatted.message}`);
      return res.status(formatted.httpStatus).json({
        success: false,
        error: formatted.errorCode,
        errorCode: formatted.errorCode,
        billingRequired: formatted.billingRequired,
        message: formatted.message,
      });
    }
  });

  // API Route: Edit existing image via Nano Banana 2 (Authenticated + Rate-limited + Zod + MIME/size check)
  app.post('/api/edit-image', mediaJson, requireFirebaseUser, aiImageLimiter, async (req: AuthenticatedRequest, res) => {
    const parsed = EditImageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMS',
        errorCode: 'INVALID_PARAMS',
        message: parsed.error.issues[0]?.message || 'Необходимы изображение и текстовая подсказка для редактирования.',
      });
    }

    const { imageBase64, mimeType, prompt, model, imageSize } = parsed.data;
    const cleanImg = parseValidatedBase64Image(imageBase64, mimeType);
    if (!cleanImg) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_IMAGE',
        errorCode: 'INVALID_IMAGE',
        message: 'Допустимы только JPEG, PNG или WEBP изображения размером до 4 МБ.',
      });
    }

    const requestedModel = normalizeImageModel(model);
    const supportsExtendedConfig =
      requestedModel === GEMINI_IMAGE_MODEL || requestedModel === GEMINI_PRO_IMAGE_MODEL;
    const safeSize = imageSize === '2K' || imageSize === '4K' ? imageSize : '1K';

    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanImg.data,
                mimeType: cleanImg.mimeType,
              },
            },
            {
              text: `Modify and edit this image while preserving the cat's identity and artistic brushstroke quality: ${prompt}.`,
            },
          ],
        },
        config: {
          imageConfig: supportsExtendedConfig ? { imageSize: safeSize } : {},
        },
      });

      let editedImage: string | null = null;
      let textNote = '';
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          editedImage = `data:${part.inlineData.mimeType ?? 'image/png'};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textNote += part.text + ' ';
        }
      }

      if (!editedImage) {
        return res.status(502).json({
          success: false,
          errorCode: 'NO_IMAGE_PART',
          message: textNote.trim() || `Модель ${requestedModel} не вернула отредактированное изображение.`,
        });
      }

      const editedArtwork: Artwork = {
        id: `vg_edit_${crypto.randomUUID()}`,
        title: `Реставрация: ${prompt.slice(0, 28)}`,
        titleEn: 'Nano Banana 2 Restored Cat Masterpiece',
        imageUrl: editedImage,
        prompt,
        style: `Доработка (${requestedModel})`,
        year: `${requestedModel}, ${new Date().getFullYear()}`,
        description: textNote.trim() || `Изображение доработано моделью ${requestedModel}: «${prompt}».`,
        palette: [
          { hex: '#0047AB', name: 'Синий' },
          { hex: '#FFD700', name: 'Золотой' },
          { hex: '#D4AF37', name: 'Охра' },
          { hex: '#1E3A8A', name: 'Кобальт' },
          { hex: '#F4A460', name: 'Холст' },
        ],
        brushstrokeNote: `Синтез оригинального холста и новых штрихов (${requestedModel}).`,
        aspectRatio: '1:1',
        createdAt: Date.now(),
        isUserCreated: true,
        modelUsed: requestedModel,
        likes: 1,
      };

      return res.json({
        success: true,
        artwork: editedArtwork,
      });
    } catch (err: any) {
      const formatted = formatGeminiImageError(err);
      console.warn(`[Image Studio Edit ${requestedModel}] ${formatted.errorCode}: ${formatted.message}`);
      return res.status(formatted.httpStatus).json({
        success: false,
        error: formatted.errorCode,
        errorCode: formatted.errorCode,
        billingRequired: formatted.billingRequired,
        message: formatted.message,
      });
    }
  });

  // API Route: Autonomous Curator Chat response (Authenticated + Rate-limited + Zod)
  app.post('/api/curator-chat', smallJson, requireFirebaseUser, curatorChatLimiter, async (req: AuthenticatedRequest, res) => {
    const parsed = CuratorChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CHAT_PARAMS',
        message: parsed.error.issues[0]?.message || 'Некорректное сообщение.',
      });
    }

    const { message, recipientPeerId, senderName } = parsed.data;
    let replyText = '';
    const isTheo = recipientPeerId.includes('theo');

    try {
      const ai = getAI();
      const systemPrompt = isTheo
        ? `Ты — Тео ван Гог, любящий брат и парижский арт-дилер Винсента ван Гога. Ты отвечаешь на письмо брата (${senderName}). Будь заботливым, вдохновляющим, упомяни парижских импрессионистов, галеристов, краску, свет Арля или холсты. Твой ответ — 2-3 коротких душевных предложения на русском языке.`
        : `Ты — Арльский Мурлыка, пушистый кот-хранитель арльской мастерской Ван Гога. Отвечай с теплом, легким мурчанием ("Мяу!"), комментируй краски, сон на палитре или лозу виноградников. 2 коротких предложения на русском.`;

      const aiRes = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: `${systemPrompt}\n\nПисьмо от ${senderName}: "${message}"\n\nТвой ответ:`,
      });
      replyText = aiRes?.text?.trim() || '';
    } catch (err) {
      console.warn('[Curator Chat Gemini Fallback]:', (err as Error).message);
    }

    if (!replyText) {
      if (isTheo) {
        const theoQuotes = [
          'Винсент, брат мой! Каждое твоё письмо приносит свет в Париж. Твои новые мазки полны неистовой искренности, я обязательно покажу их парижским знатокам.',
          'Дорогой Винсент! Жёлтые и ультрамариновые тона на твоих холстах обладают невероятной силой. Я высылаю тебе свежую партию цинковых белил и кобальта.',
          'Я получил твоё послание! Твоя верность искусству восхищает меня. Париж суетлив, но твои картины из Арля дышат вечностью и солнцем юга.',
        ];
        replyText = theoQuotes[Math.floor(Math.random() * theoQuotes.length)];
      } else {
        const catQuotes = [
          'Мурр! Я как раз дремал на тёплом холсте с подсолнухами. Твои краски пахнут солнцем и свежим льняным маслом! Мяу!',
          'Мяу! Проверил палитру лапкой — синий кобальт идеален для ночного неба над Роной. Жду твоего возвращения с этюдов!',
        ];
        replyText = catQuotes[Math.floor(Math.random() * catQuotes.length)];
      }
    }

    return res.json({
      success: true,
      senderPeerId: recipientPeerId,
      senderName: isTheo ? 'Тео Ван Гог (Парижский салон)' : 'Арльский Мурлыка',
      reply: replyText,
      timestamp: Date.now(),
    });
  });

  // API Route: LAN info disabled in production to avoid leaking host IPs & hostname
  app.get('/api/network/lan-info', (_req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
    const interfaces = os.networkInterfaces();
    const lanIps: string[] = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          lanIps.push(net.address);
        }
      }
    }
    return res.json({
      success: true,
      port: PORT,
      lanIps,
      hostname: os.hostname(),
      platform: os.platform(),
      primaryUrl: lanIps.length > 0 ? `http://${lanIps[0]}:${PORT}` : `http://localhost:${PORT}`,
    });
  });

  // ==========================================
  // Authenticated WebRTC P2P Signaling + WebSocket Relay
  // ==========================================
  const MAX_SIGNALING_PEERS = 200;
  const PEER_TTL_MS = 35_000;
  const SIGNAL_TTL_MS = 60_000;

  interface SignalingPeerRecord {
    peerId: string;
    name: string;
    avatarColor: string;
    lastHeartbeat: number;
    artworkCount: number;
    ecdhPublicKeyJwk?: unknown;
    ecdsaPublicKeyJwk?: unknown;
    sessionToken: string;
  }

  interface QueuedSignal {
    id: string;
    fromPeerId: string;
    toPeerId: string;
    signalType: 'OFFER' | 'ANSWER' | 'ICE';
    payload: unknown;
    timestamp: number;
  }

  const activeSignalingPeers = new Map<string, SignalingPeerRecord>();
  const sessionTokenToPeerId = new Map<string, string>();
  const queuedSignals = new Map<string, QueuedSignal[]>();
  const peerSockets = new Map<string, WebSocket>();

  function getPublicPeerList(excludePeerId?: string) {
    const now = Date.now();
    return Array.from(activeSignalingPeers.values())
      .filter(p => now - p.lastHeartbeat <= PEER_TTL_MS && p.peerId !== excludePeerId)
      .map(({ sessionToken: _token, ...publicFields }) => {
        void _token;
        return publicFields;
      });
  }

  function broadcastPeersSnapshot() {
    for (const [peerId, ws] of peerSockets.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'peers_update', peers: getPublicPeerList(peerId) }));
        } catch (err) {
          console.warn('[WS Peers Broadcast]', (err as Error).message);
        }
      }
    }
  }

  function requireP2PSession(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'P2P_AUTH_REQUIRED' });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const peerId = sessionTokenToPeerId.get(token);
    if (!peerId) {
      return res.status(401).json({ error: 'INVALID_P2P_SESSION' });
    }
    const peer = activeSignalingPeers.get(peerId);
    if (!peer || peer.sessionToken !== token) {
      sessionTokenToPeerId.delete(token);
      return res.status(401).json({ error: 'EXPIRED_P2P_SESSION' });
    }
    req.p2pPeerId = peerId;
    next();
  }

  setInterval(() => {
    const now = Date.now();
    let changed = false;
    for (const [peerId, peer] of activeSignalingPeers.entries()) {
      if (now - peer.lastHeartbeat > PEER_TTL_MS) {
        activeSignalingPeers.delete(peerId);
        sessionTokenToPeerId.delete(peer.sessionToken);
        queuedSignals.delete(peerId);
        const ws = peerSockets.get(peerId);
        if (ws) {
          try {
            ws.close(4000, 'Session expired');
          } catch {}
          peerSockets.delete(peerId);
        }
        changed = true;
      }
    }
    for (const [targetId, queue] of queuedSignals.entries()) {
      const fresh = queue.filter(sig => now - sig.timestamp <= SIGNAL_TTL_MS);
      if (fresh.length !== queue.length) {
        queuedSignals.set(targetId, fresh);
      }
    }
    if (changed) broadcastPeersSnapshot();
  }, 15_000);

  // Register peer in signaling room and mint ephemeral Bearer session token
  app.post('/api/p2p/register', smallJson, p2pLimiter, (req, res) => {
    const parsed = P2PRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'PEER_PARAMS_REQUIRED',
        message: parsed.error.issues[0]?.message,
      });
    }

    const { peerId, name, avatarColor, artworkCount, ecdhPublicKeyJwk, ecdsaPublicKeyJwk } = parsed.data;
    const now = Date.now();
    const existing = activeSignalingPeers.get(peerId);

    if (existing && now - existing.lastHeartbeat <= PEER_TTL_MS) {
      const callerAuth = req.headers.authorization;
      const callerToken = callerAuth?.startsWith('Bearer ') ? callerAuth.slice(7).trim() : '';
      if (callerToken !== existing.sessionToken) {
        return res.status(409).json({
          error: 'PEER_ID_IN_USE',
          message: 'Этот peerId уже активен с другой сессией.',
        });
      }
    } else if (!existing && activeSignalingPeers.size >= MAX_SIGNALING_PEERS) {
      return res.status(503).json({
        error: 'SIGNALING_ROOM_FULL',
        message: 'Сигнальная комната заполнена. Попробуйте позже.',
      });
    }

    if (existing) {
      sessionTokenToPeerId.delete(existing.sessionToken);
    }

    const sessionToken = crypto.randomUUID();
    const peerInfo: SignalingPeerRecord = {
      peerId,
      name,
      avatarColor: avatarColor || 'from-amber-500 to-yellow-600',
      lastHeartbeat: now,
      artworkCount,
      ecdhPublicKeyJwk,
      ecdsaPublicKeyJwk,
      sessionToken,
    };

    activeSignalingPeers.set(peerId, peerInfo);
    sessionTokenToPeerId.set(sessionToken, peerId);
    if (!queuedSignals.has(peerId)) {
      queuedSignals.set(peerId, []);
    }

    broadcastPeersSnapshot();

    return res.json({
      success: true,
      registeredPeerId: peerId,
      sessionToken,
      onlinePeers: getPublicPeerList(peerId),
    });
  });

  // List all currently online peers (authenticated)
  app.get('/api/p2p/peers', requireP2PSession, (req: AuthenticatedRequest, res) => {
    return res.json({ peers: getPublicPeerList(req.p2pPeerId) });
  });

  // Heartbeat keepalive (identity bound to session token)
  app.post('/api/p2p/heartbeat', smallJson, requireP2PSession, p2pLimiter, (req: AuthenticatedRequest, res) => {
    const peer = activeSignalingPeers.get(req.p2pPeerId!);
    if (peer) {
      peer.lastHeartbeat = Date.now();
      const count = req.body?.artworkCount;
      if (typeof count === 'number' && Number.isFinite(count) && count >= 0) {
        peer.artworkCount = Math.floor(count);
      }
    }
    return res.json({ success: true, timestamp: Date.now() });
  });

  // Send signaling message (Offer / Answer / ICE Candidate) with server-verified sender
  app.post('/api/p2p/signal/send', smallJson, requireP2PSession, p2pLimiter, (req: AuthenticatedRequest, res) => {
    const parsed = P2PSignalSendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_SIGNAL_PAYLOAD' });
    }

    const { toPeerId, signalType, payload } = parsed.data;
    let serializedLen = 0;
    try {
      serializedLen = JSON.stringify(payload).length;
    } catch {
      return res.status(400).json({ error: 'INVALID_SIGNAL_PAYLOAD' });
    }
    if (!payload || serializedLen > 16384) {
      return res.status(400).json({ error: 'SIGNAL_PAYLOAD_TOO_LARGE' });
    }

    const signal: QueuedSignal = {
      id: `sig_${crypto.randomUUID()}`,
      fromPeerId: req.p2pPeerId!,
      toPeerId,
      signalType,
      payload,
      timestamp: Date.now(),
    };

    const targetWs = peerSockets.get(toPeerId);
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      try {
        targetWs.send(JSON.stringify({ type: 'signal_delivery', signal }));
        return res.json({ success: true, deliveredViaWs: true });
      } catch (err) {
        console.warn('[WS Signal Delivery Fallback]', (err as Error).message);
      }
    }

    let recipientQueue = queuedSignals.get(toPeerId) || [];
    const now = Date.now();
    recipientQueue = recipientQueue.filter(s => now - s.timestamp <= SIGNAL_TTL_MS);
    recipientQueue.push(signal);
    if (recipientQueue.length > 50) {
      recipientQueue.splice(0, recipientQueue.length - 50);
    }
    queuedSignals.set(toPeerId, recipientQueue);

    return res.json({ success: true, deliveredViaWs: false });
  });

  // Poll for signals directed strictly to the authenticated session's peer
  function handleSignalPoll(req: AuthenticatedRequest, res: Response) {
    const sessionPeerId = req.p2pPeerId!;
    if (req.params.peerId && req.params.peerId !== sessionPeerId) {
      return res.status(403).json({ error: 'FORBIDDEN_PEER_POLL' });
    }

    const peer = activeSignalingPeers.get(sessionPeerId);
    if (peer) {
      peer.lastHeartbeat = Date.now();
    }

    const now = Date.now();
    const queue = (queuedSignals.get(sessionPeerId) || []).filter(s => now - s.timestamp <= SIGNAL_TTL_MS);
    queuedSignals.set(sessionPeerId, []);

    return res.json({
      success: true,
      signals: queue,
      activePeersCount: activeSignalingPeers.size,
    });
  }

  app.get('/api/p2p/signal/poll', requireP2PSession, handleSignalPoll);
  app.get('/api/p2p/signal/poll/:peerId', requireP2PSession, handleSignalPoll);

  // Peer graceful leave (session-bound)
  app.post('/api/p2p/leave', smallJson, requireP2PSession, (req: AuthenticatedRequest, res) => {
    const peerId = req.p2pPeerId!;
    const peer = activeSignalingPeers.get(peerId);
    if (peer) {
      sessionTokenToPeerId.delete(peer.sessionToken);
      activeSignalingPeers.delete(peerId);
    }
    queuedSignals.delete(peerId);
    const ws = peerSockets.get(peerId);
    if (ws) {
      try {
        ws.close(1000, 'Peer left');
      } catch {}
      peerSockets.delete(peerId);
    }
    broadcastPeersSnapshot();
    return res.json({ success: true });
  });

  // WebSocket signaling endpoint mounted on /ws/p2p
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/p2p' });
  wss.on('connection', (socket, req) => {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      const token = url.searchParams.get('token') || '';
      const peerId = sessionTokenToPeerId.get(token);
      const peer = peerId ? activeSignalingPeers.get(peerId) : undefined;
      if (!peerId || !peer || peer.sessionToken !== token) {
        socket.close(4001, 'Unauthorized signaling token');
        return;
      }

      peerSockets.set(peerId, socket);
      peer.lastHeartbeat = Date.now();

      // Flush any signals queued prior to WebSocket upgrade
      const now = Date.now();
      const pending = (queuedSignals.get(peerId) || []).filter(s => now - s.timestamp <= SIGNAL_TTL_MS);
      if (pending.length > 0) {
        queuedSignals.set(peerId, []);
        for (const signal of pending) {
          socket.send(JSON.stringify({ type: 'signal_delivery', signal }));
        }
      }

      socket.send(JSON.stringify({ type: 'peers_update', peers: getPublicPeerList(peerId) }));

      socket.on('close', () => {
        if (peerSockets.get(peerId) === socket) {
          peerSockets.delete(peerId);
        }
      });
    } catch {
      socket.close(4000, 'Invalid signaling connection');
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Van Gogh Cat Studio Server running on http://localhost:${PORT}`);
  });
}

startServer();
