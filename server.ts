import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { Communicate } from 'edge-tts-universal';
import { createServer as createViteServer } from 'vite';
import { VAN_GOGH_STYLE_PRESETS } from './src/data/stylePresets';
import { Artwork } from './src/types';

// Prevent tsx's global __dirname = '.' from breaking createRequire in vite plugins (e.g. vite-plugin-pwa)
if ((globalThis as Record<string, unknown>).__dirname === '.') {
  delete (globalThis as Record<string, unknown>).__dirname;
}

dotenv.config();

// In-memory store for user generated artworks during session
let sessionArtworks: Artwork[] = [];

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
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);

  // Support large base64 image uploads for editing
  app.use(express.json({ limit: '25mb' }));

  // API Route: Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', artworksCount: sessionArtworks.length });
  });

  // API Route: AI engine status (never exposes key value)
  app.get('/api/ai-status', (req, res) => {
    res.json({
      success: true,
      hasServerKey: Boolean(process.env.GEMINI_API_KEY),
      defaultModel: 'gemini-nano-banana-2.1',
      supportedModels: ['gemini-nano-banana-2.1', 'gemini-3.1-flash-lite-image', 'gemini-3-pro-image'],
    });
  });

  // API Route: Get gallery masterpieces (filtering out any corrupted vector/SVG graphics)
  app.get('/api/gallery', (req, res) => {
    sessionArtworks = sessionArtworks.filter(a =>
      !a.imageUrl?.startsWith('data:image/svg+xml') &&
      !a.imageUrl?.includes('<svg') &&
      !a.id?.startsWith('vg_edit_')
    );
    res.json({ artworks: sessionArtworks });
  });

  // API Route: Delete an authored publication permanently
  app.delete('/api/artwork/:id', (req, res) => {
    const { id } = req.params;
    const initialLen = sessionArtworks.length;
    sessionArtworks = sessionArtworks.filter(a => a.id !== id);
    res.json({
      success: true,
      deletedId: id,
      deletedCount: initialLen - sessionArtworks.length,
      remainingCount: sessionArtworks.length
    });
  });

  // Helper: Convert raw 16-bit linear PCM into a standard WAV container
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

  // API Route: High-Definition Neural Audio Guide TTS (Voicebox Neural & Gemini Flash TTS)
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voice = 'ru-RU-DmitryNeural', rate = '+0%', pitch = '+0Hz' } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'TEXT_REQUIRED', message: 'Текст обязателен для озвучивания.' });
      }

      const cleanText = text.trim();
      const isGeminiVoice = voice.startsWith('gemini-');

      // 1. If Gemini Generative Voice requested
      if (isGeminiVoice) {
        try {
          const ai = getAI();
          const geminiVoiceMap: Record<string, string> = {
            'gemini-aoede': 'Aoede',
            'gemini-charon': 'Charon',
            'gemini-fenrir': 'Fenrir'
          };
          const prebuiltVoiceName = geminiVoiceMap[voice] || 'Charon';

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: cleanText,
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: prebuiltVoiceName
                  }
                }
              }
            }
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
              audioDataUrl: `data:audio/wav;base64,${wavBuffer.toString('base64')}`
            });
          }
        } catch (geminiErr: any) {
          console.warn('[TTS] Gemini Voice fallback to Voicebox Neural:', geminiErr?.message?.slice(0, 100));
        }
      }

      // 2. High-Definition Voicebox Neural Studio Speech Engine (Edge Neural)
      const edgeVoice = isGeminiVoice ? 'ru-RU-DmitryNeural' : voice;
      const comm = new Communicate(cleanText, {
        voice: edgeVoice,
        rate: rate || '+0%',
        pitch: pitch || '+0Hz'
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
        audioDataUrl: `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`
      });
    } catch (err: any) {
      console.error('[TTS Route Error]:', err);
      return res.status(500).json({
        success: false,
        error: 'TTS_SYNTHESIS_FAILED',
        message: err?.message || 'Не удалось синтезировать голос аудиогида'
      });
    }
  });

  // Helper: Normalize image model to valid official Nano Banana models
  function normalizeImageModel(rawModel?: string): 'gemini-nano-banana-2.1' | 'gemini-3.1-flash-lite-image' | 'gemini-3-pro-image' {
    if (rawModel === 'gemini-3.1-flash-lite-image') return 'gemini-3.1-flash-lite-image';
    if (rawModel === 'gemini-3-pro-image') return 'gemini-3-pro-image';
    return 'gemini-nano-banana-2.1';
  }

  // Helper: Map Gemini SDK errors cleanly to client-facing HTTP status and Russian guidance
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
        message: 'Не подключён серверный ключ Gemini (Settings > Secrets). Подключите свой биллинг-проект или ключ в настройках AI Studio.',
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
      return {
        httpStatus: statusNum === 429 ? 429 : 403,
        errorCode: 'GEMINI_BILLING_OR_QUOTA',
        billingRequired: true,
        message: `Nano Banana 2 требует активный биллинг Google Cloud / квоту на ключе Gemini (${rawMsg.slice(0, 140)}).`,
      };
    }
    return {
      httpStatus: statusNum >= 400 && statusNum < 600 ? statusNum : 500,
      errorCode: 'GEMINI_GENERATION_FAILED',
      billingRequired: false,
      message: rawMsg.slice(0, 260),
    };
  }

  // API Route: Generate new Van Gogh / custom-style cat image via Nano Banana 2 (supports multi-photo reference upload)
  app.post('/api/generate-image', async (req, res) => {
    const {
      prompt = 'Нарисуй котика в стиле Вана Гога',
      model = 'gemini-nano-banana-2.1',
      aspectRatio = '1:1',
      imageSize = '1K',
      stylePresetId = 'starry_night',
      customStylePrompt = '',
      referenceImages = [],
    } = req.body;

    const requestedModel = normalizeImageModel(model);
    const stylePreset = VAN_GOGH_STYLE_PRESETS.find((p) => p.id === stylePresetId) || VAN_GOGH_STYLE_PRESETS[0];
    const hasCustomStyle = typeof customStylePrompt === 'string' && customStylePrompt.trim().length > 0;
    const styleDirective = hasCustomStyle
      ? `in this exact custom artistic style described by the user: "${customStylePrompt.trim()}". Maintain expressive painterly mastery and cohesive palette across the entire artwork.`
      : `${stylePreset.promptModifier}. Ensure authentic post-impressionist brushstroke texture, vibrant colors, and expressive emotional mood.`;

    const validRefs = Array.isArray(referenceImages)
      ? referenceImages
          .filter((img: any) => img && typeof img.dataUrl === 'string' && img.dataUrl.includes('base64,'))
          .slice(0, 4)
      : [];

    const refInstruction =
      validRefs.length > 0
        ? `Using the ${validRefs.length} reference photo(s) of the user's real cat(s), faithfully preserve each cat's exact fur colors, markings, face shape, ear shape, and eye color while transforming the scene into a fine-art painting. `
        : '';

    const enrichedPrompt = `${refInstruction}${prompt}. ${styleDirective}`;

    const parts: any[] = [];
    for (const ref of validRefs) {
      const match = ref.dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      const mimeType = ref.mimeType || match?.[1] || 'image/jpeg';
      const data = match?.[2] || ref.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      if (data) {
        parts.push({
          inlineData: {
            data,
            mimeType,
          },
        });
      }
    }
    parts.push({ text: enrichedPrompt });

    const supportsExtendedConfig =
      requestedModel === 'gemini-nano-banana-2.1' || requestedModel === 'gemini-3-pro-image';
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

      let generatedImage: string | null = null;
      let textNote = '';
      const outParts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of outParts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          generatedImage = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textNote += part.text + ' ';
        }
      }

      if (!generatedImage) {
        return res.status(502).json({
          success: false,
          errorCode: 'NO_IMAGE_PART',
          billingRequired: false,
          message: textNote.trim() || `Модель ${requestedModel} не вернула изображение. Попробуйте уточнить описание.`,
        });
      }

      const displayStyleName = hasCustomStyle
        ? `Свой стиль: ${customStylePrompt.trim().slice(0, 40)}`
        : stylePreset.name;

      const newArtwork: Artwork = {
        id: `vg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
        aspectRatio: safeRatio as any,
        createdAt: Date.now(),
        isUserCreated: true,
        modelUsed: requestedModel,
        likes: 1,
      };

      sessionArtworks.unshift(newArtwork);

      return res.json({
        success: true,
        artwork: newArtwork,
        promptUsed: enrichedPrompt,
        modelUsed: requestedModel,
      });
    } catch (modelErr: any) {
      const formatted = formatGeminiImageError(modelErr);
      console.warn(`[Image Studio ${requestedModel} Error]:`, formatted.errorCode, modelErr?.message || '');
      return res.status(formatted.httpStatus).json({
        success: false,
        error: formatted.errorCode,
        errorCode: formatted.errorCode,
        billingRequired: formatted.billingRequired,
        message: formatted.message,
      });
    }
  });

  // API Route: Edit existing image via Nano Banana 2
  app.post('/api/edit-image', async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType = 'image/png',
        prompt,
        model = 'gemini-nano-banana-2.1',
        imageSize = '1K',
      } = req.body;

      if (!imageBase64 || !prompt) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PARAMS',
          message: 'Необходимы изображение и текстовая подсказка для редактирования.',
        });
      }

      const requestedModel = normalizeImageModel(model);
      const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      const resolvedMime = match?.[1] || mimeType || 'image/png';
      const cleanBase64 = match?.[2] || imageBase64.replace(/^data:image\/\w+;base64,/, '');

      const supportsExtendedConfig =
        requestedModel === 'gemini-nano-banana-2.1' || requestedModel === 'gemini-3-pro-image';
      const safeSize = imageSize === '2K' || imageSize === '4K' ? imageSize : '1K';

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: resolvedMime,
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
        id: `vg_edit_${Date.now()}`,
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

      sessionArtworks.unshift(editedArtwork);

      return res.json({
        success: true,
        artwork: editedArtwork,
      });
    } catch (err: any) {
      const formatted = formatGeminiImageError(err);
      console.error('Image edit error:', formatted.errorCode, err?.message || '');
      return res.status(formatted.httpStatus).json({
        success: false,
        error: formatted.errorCode,
        errorCode: formatted.errorCode,
        billingRequired: formatted.billingRequired,
        message: formatted.message,
      });
    }
  });

  // API Route: Autonomous P2P Chat response from Theo Van Gogh or Arles Cat
  app.post('/api/curator-chat', async (req, res) => {
    const { message = '', recipientPeerId = 'peer_theo_vangogh', senderName = 'Винсент' } = req.body;
    let replyText = '';

    const isTheo = recipientPeerId.includes('theo');

    // Attempt Gemini personality reply
    try {
      const ai = getAI();
      const systemPrompt = isTheo
        ? `Ты — Тео ван Гог, любящий брат и парижский арт-дилер Винсента ван Гога. Ты отвечаешь на письмо брата (${senderName}). Будь заботливым, вдохновляющим, упомяни парижских импрессионистов, галеристов, краску, свет Арля или холсты. Твой ответ — 2-3 коротких душевных предложения на русском языке.`
        : `Ты — Арльский Мурлыка, пушистый кот-хранитель арльской мастерской Ван Гога. Отвечай с теплом, легким мурчанием ("Мяу!"), комментируй краски, сон на палитре или лозу виноградников. 2 коротких предложения на русском.`;

      const aiRes = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${systemPrompt}\n\nПисьмо от ${senderName}: "${message}"\n\nТвой ответ:`
      });
      replyText = aiRes?.text?.trim() || '';
    } catch {
      // Fallback offline responses
    }

    if (!replyText) {
      if (isTheo) {
        const theoQuotes = [
          `Винсент, брат мой! Каждое твоё письмо приносит свет в Париж. Твои новые мазки полны неистовой искренности, я обязательно покажу их парижским знатокам. Береги силы и продолжай писать!`,
          `Дорогой Винсент! Жёлтые и ультрамариновые тона на твоих холстах обладают невероятной силой. Я высылаю тебе свежую партию цинковых белил и кобальта. Твой брат Тео.`,
          `Я получил твоё послание! Твоя верность искусству восхищает меня. Париж суетлив, но твои картины из Арля дышат вечностью и солнцем юга.`
        ];
        replyText = theoQuotes[Math.floor(Math.random() * theoQuotes.length)];
      } else {
        const catQuotes = [
          `Мурр! Я как раз дремал на тёплом холсте с подсолнухами. Твои краски пахнут солнцем и свежим льняным маслом! Мяу!`,
          `Мяу! Проверил палитру лапкой — синий кобальт идеален для ночного неба над Роной. Жду твоего возвращения с этюдов!`
        ];
        replyText = catQuotes[Math.floor(Math.random() * catQuotes.length)];
      }
    }

    return res.json({
      success: true,
      senderPeerId: recipientPeerId,
      senderName: isTheo ? 'Тео Ван Гог (Парижский салон)' : 'Арльский Мурлыка',
      reply: replyText,
      timestamp: Date.now()
    });
  });

  // API Route: LAN info for multi-host Ubuntu discovery & dual-node connection
  app.get('/api/network/lan-info', (req, res) => {
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
      primaryUrl: lanIps.length > 0 ? `http://${lanIps[0]}:${PORT}` : `http://localhost:${PORT}`
    });
  });

  // ==========================================
  // WebRTC P2P Signaling Relay Architecture
  // ==========================================
  interface SignalingPeer {
    peerId: string;
    name: string;
    avatarColor: string;
    lastHeartbeat: number;
    artworkCount: number;
  }

  interface QueuedSignal {
    id: string;
    fromPeerId: string;
    toPeerId: string;
    signalType: 'OFFER' | 'ANSWER' | 'ICE';
    payload: any;
    timestamp: number;
  }

  const activeSignalingPeers = new Map<string, SignalingPeer>();
  const queuedSignals = new Map<string, QueuedSignal[]>(); // toPeerId -> list of signals

  // Periodically clean up offline peers (35s timeout)
  setInterval(() => {
    const now = Date.now();
    for (const [peerId, peer] of activeSignalingPeers.entries()) {
      if (now - peer.lastHeartbeat > 35000) {
        activeSignalingPeers.delete(peerId);
        queuedSignals.delete(peerId);
      }
    }
  }, 15000);

  // Register peer in signaling room
  app.post('/api/p2p/register', (req, res) => {
    const { peerId, name, avatarColor, artworkCount = 0 } = req.body;
    if (!peerId || !name) {
      return res.status(400).json({ error: 'PEER_PARAMS_REQUIRED' });
    }

    const peerInfo: SignalingPeer = {
      peerId,
      name,
      avatarColor: avatarColor || 'from-amber-500 to-yellow-600',
      lastHeartbeat: Date.now(),
      artworkCount: Number(artworkCount) || 0,
    };

    activeSignalingPeers.set(peerId, peerInfo);
    if (!queuedSignals.has(peerId)) {
      queuedSignals.set(peerId, []);
    }

    const otherPeers = Array.from(activeSignalingPeers.values()).filter(p => p.peerId !== peerId);
    return res.json({
      success: true,
      registeredPeerId: peerId,
      onlinePeers: otherPeers,
    });
  });

  // List all currently online peers
  app.get('/api/p2p/peers', (req, res) => {
    const { currentPeerId } = req.query;
    const now = Date.now();
    const peers = Array.from(activeSignalingPeers.values())
      .filter(p => now - p.lastHeartbeat <= 35000 && p.peerId !== currentPeerId);
    return res.json({ peers });
  });

  // Heartbeat keepalive
  app.post('/api/p2p/heartbeat', (req, res) => {
    const { peerId, artworkCount } = req.body;
    if (!peerId) return res.status(400).json({ error: 'MISSING_PEER_ID' });

    const existing = activeSignalingPeers.get(peerId);
    if (existing) {
      existing.lastHeartbeat = Date.now();
      if (artworkCount !== undefined) {
        existing.artworkCount = Number(artworkCount);
      }
    }
    return res.json({ success: true, timestamp: Date.now() });
  });

  // Send signaling message (Offer / Answer / ICE Candidate)
  app.post('/api/p2p/signal/send', (req, res) => {
    const { fromPeerId, toPeerId, signalType, payload } = req.body;
    if (!fromPeerId || !toPeerId || !signalType || !payload) {
      return res.status(400).json({ error: 'INVALID_SIGNAL_PAYLOAD' });
    }

    let recipientQueue = queuedSignals.get(toPeerId);
    if (!recipientQueue) {
      recipientQueue = [];
      queuedSignals.set(toPeerId, recipientQueue);
    }

    recipientQueue.push({
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fromPeerId,
      toPeerId,
      signalType,
      payload,
      timestamp: Date.now(),
    });

    // Cap queue size
    if (recipientQueue.length > 50) {
      recipientQueue.splice(0, recipientQueue.length - 50);
    }

    return res.json({ success: true });
  });

  // Poll for signals directed to this peer
  app.get('/api/p2p/signal/poll/:peerId', (req, res) => {
    const { peerId } = req.params;
    if (!peerId) return res.status(400).json({ error: 'MISSING_PEER_ID' });

    // Update heartbeat on poll
    const peer = activeSignalingPeers.get(peerId);
    if (peer) {
      peer.lastHeartbeat = Date.now();
    }

    const queue = queuedSignals.get(peerId) || [];
    // Drain queue
    queuedSignals.set(peerId, []);

    return res.json({
      success: true,
      signals: queue,
      activePeersCount: activeSignalingPeers.size,
    });
  });

  // Peer graceful leave
  app.post('/api/p2p/leave', (req, res) => {
    const { peerId } = req.body;
    if (peerId) {
      activeSignalingPeers.delete(peerId);
      queuedSignals.delete(peerId);
    }
    return res.json({ success: true });
  });

  // Vite middleware for development or Static server in production
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
    // Support Express v4 and v5 wildcard syntax
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Van Gogh Cat Studio Server running on http://localhost:${PORT}`);
  });
}

startServer();
