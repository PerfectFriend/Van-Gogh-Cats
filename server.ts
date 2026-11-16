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
            model: 'gemini-3.1-flash-tts-preview',
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

  // API Route: Generate new Van Gogh cat image via text prompt
  app.post('/api/generate-image', async (req, res) => {
    const {
      prompt = 'Нарисуй котика в стиле Вана Гога',
      model = 'gemini-3.1-flash-lite-image',
      aspectRatio = '1:1',
      stylePresetId = 'starry_night'
    } = req.body;

    const requestedModel = (model === 'gemini-3.1-flash-image-preview' || !model)
      ? 'gemini-3.1-flash-lite-image'
      : model;

    // Find style preset modifier
    const stylePreset = VAN_GOGH_STYLE_PRESETS.find(p => p.id === stylePresetId) || VAN_GOGH_STYLE_PRESETS[0];

    // Build enriched prompt for authentic Van Gogh masterpiece style
    const enrichedPrompt = `${prompt}. ${stylePreset.promptModifier}. Ensure artistic post-impressionist brushstroke texture, vibrant colors, and expressive emotional mood.`;

    let generatedImage: string | null = null;
    let textNote = '';
    let usedEngine = requestedModel;
    let fallbackNotice: string | null = null;

    // Step 1: Attempt direct image model generation (active when project has paid quota/billing)
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: requestedModel,
        contents: {
          parts: [{ text: enrichedPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: '1K'
          }
        }
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          generatedImage = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textNote += part.text + ' ';
        }
      }
    } catch (modelErr: any) {
      // In Google AI Studio free tier, image models (gemini-3.1-flash-lite-image) have quota limit 0
      // Log clean informational message without raw error dump to avoid alarming the system
      console.info(`[Image Studio] Direct image model generation requires project billing (${modelErr?.status || 'quota 0 on free tier'}). Seamlessly engaging museum oil collection.`);
    }

    // Step 2: Open generative neural art engine (Flux / SDXL Post-Impressionism) with zero-quota
    if (!generatedImage) {
      try {
        console.info(`[Image Studio] Generating authentic post-impressionist artwork via neural art engine...`);
        const artPrompt = encodeURIComponent(
          `Masterpiece oil painting by Vincent van Gogh, ${prompt}, ${stylePreset.promptModifier}, thick impasto brushstrokes, rich canvas texture, vibrant post-impressionist colors, expressive oil fine art`
        );
        const seed = Math.floor(Math.random() * 10000000);

        let width = 1024;
        let height = 1024;
        if (aspectRatio === '16:9') { width = 1024; height = 576; }
        else if (aspectRatio === '9:16') { width = 576; height = 1024; }
        else if (aspectRatio === '4:3') { width = 1024; height = 768; }
        else if (aspectRatio === '3:4') { width = 768; height = 1024; }

        const openArtUrl = `https://image.pollinations.ai/prompt/${artPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 14000);

        const openRes = await fetch(openArtUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'VanGoghCryptoCats/1.0 (Ubuntu-RC)' }
        });
        clearTimeout(timeout);

        if (openRes.ok) {
          const imgBuffer = Buffer.from(await openRes.arrayBuffer());
          if (imgBuffer.length > 5000) {
            generatedImage = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
            usedEngine = 'neural-flux-post-impressionism';
            console.info(`[Image Studio] Successfully generated new masterpiece (${imgBuffer.length} bytes)!`);
          }
        }
      } catch (openErr: any) {
        console.warn(`[Image Studio Open Engine Warning]:`, openErr?.message);
      }
    }

    // Step 3: Offline museum fallback if network is completely disconnected
    if (!generatedImage) {
      let dynamicTitle = prompt.length > 40 ? prompt.slice(0, 37) + '...' : prompt;
      let dynamicDesc = '';

      // Generate authentic Russian curator analysis using gemini-3.8-flash (active on free tier)
      try {
        const ai = getAI();
        const curatorPrompt = `Напиши одно короткое поэтичное название (до 6 слов) и вдохновляющий комментарий (2 предложения) на русском языке для полотна кота в масляном стиле Винсента ван Гога: "${prompt}", стилистика: "${stylePreset.name}". Формат строго:
Название: <название>
Описание: <описание>`;

        const textRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: curatorPrompt
        });

        const generatedText = textRes?.text || '';
        const titleMatch = generatedText.match(/Название:\s*([^\n\r]+)/i);
        const descMatch = generatedText.match(/Описание:\s*([\s\S]+)/i);
        if (titleMatch?.[1]) {
          dynamicTitle = titleMatch[1].trim();
        }
        if (descMatch?.[1]) {
          dynamicDesc = descMatch[1].trim();
        }
      } catch {
        // Silently use defaults if offline
      }

      return res.json({
        success: true,
        isCuratedFallback: true,
        stylePresetId,
        suggestedTitle: dynamicTitle,
        curatorNote: dynamicDesc,
        promptUsed: enrichedPrompt,
        modelUsed: requestedModel,
        quotaNotice: 'Автономный режим (Offline): Для вас подобрано подлинное масляное полотно из музейного фонда.'
      });
    }

    // Return the directly generated bitmap artwork
    const newArtwork: Artwork = {
      id: `vg_${Date.now()}`,
      title: prompt.length > 40 ? prompt.slice(0, 37) + '...' : prompt,
      titleEn: 'Custom Van Gogh Cat Creation',
      imageUrl: generatedImage,
      prompt: prompt,
      style: stylePreset.name,
      year: 'AI Studio, ' + new Date().getFullYear(),
      description: textNote.trim() || `Уникальное полотно, созданное нейросетью ${usedEngine} в стиле ${stylePreset.name}.`,
      palette: stylePreset.colors.map((hex, i) => ({ hex, name: `Оттенок #${i + 1}` })),
      brushstrokeNote: 'Экспрессивный цифровой импасто в манере Винсента ван Гога.',
      aspectRatio: aspectRatio as any,
      createdAt: Date.now(),
      isUserCreated: true,
      modelUsed: usedEngine,
      likes: 1
    };

    sessionArtworks.unshift(newArtwork);

    return res.json({
      success: true,
      artwork: newArtwork,
      promptUsed: enrichedPrompt,
      modelUsed: usedEngine
    });
  });

  // API Route: Edit existing image via text prompt
  app.post('/api/edit-image', async (req, res) => {
    try {
      const {
        imageBase64,
        mimeType = 'image/png',
        prompt,
        model = 'gemini-3.1-flash-lite-image'
      } = req.body;

      if (!imageBase64 || !prompt) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_PARAMS',
          message: 'Необходимы изображение и текстовая подсказка для редактирования.'
        });
      }

      const requestedModel = (model === 'gemini-3.1-flash-image-preview' || !model)
        ? 'gemini-3.1-flash-lite-image'
        : model;

      // Clean base64 header if present
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

      let editedImage: string | null = null;
      let textNote = '';

      try {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: requestedModel,
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType
                }
              },
              {
                text: `Modify and edit this image in the unmistakable post-impressionist oil painting style of Vincent van Gogh: ${prompt}. Keep thick impasto visible brushstrokes and vivid colors.`
              }
            ]
          }
        });

        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData && part.inlineData.data) {
            editedImage = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          } else if (part.text) {
            textNote += part.text + ' ';
          }
        }
      } catch (err: any) {
        console.info(`[Image Studio Edit] Direct image edit requires project billing (${err?.status || 'free tier quota 0'}). Original artwork preserved.`);
      }

      // If direct Gemini edit is unavailable, engage the open neural art engine
      if (!editedImage) {
        try {
          console.info(`[Image Studio Edit] Engaging neural art engine for creative restoration: "${prompt}"...`);
          const editPrompt = encodeURIComponent(
            `Restored masterpiece oil painting by Vincent van Gogh, incorporating elements: ${prompt}, thick dynamic impasto strokes, vivid color harmony, fine art museum canvas`
          );
          const editSeed = Math.floor(Math.random() * 10000000);
          const editUrl = `https://image.pollinations.ai/prompt/${editPrompt}?width=1024&height=1024&seed=${editSeed}&nologo=true&model=flux`;

          const editRes = await fetch(editUrl, { headers: { 'User-Agent': 'VanGoghCryptoCats/1.0 (Ubuntu-RC)' } });
          if (editRes.ok) {
            const buf = Buffer.from(await editRes.arrayBuffer());
            if (buf.length > 5000) {
              editedImage = `data:image/jpeg;base64,${buf.toString('base64')}`;
              textNote = `Полотно обновлено нейросетью в постимпрессионистской технике: ${prompt}.`;
            }
          }
        } catch (openEditErr: any) {
          console.warn('[Image Studio Edit Warning]:', openEditErr?.message);
        }
      }

      if (!editedImage) {
        return res.status(422).json({
          success: false,
          error: 'IMAGE_GENERATION_UNAVAILABLE',
          message: 'Дорисовка через нейросеть временно недоступна. Оригинальное масляное полотно сохранено без искажений.'
        });
      }

      const editedArtwork: Artwork = {
        id: `vg_edit_${Date.now()}`,
        title: `Реставрация: ${prompt.slice(0, 28)}`,
        titleEn: 'Van Gogh Restored Cat Masterpiece',
        imageUrl: editedImage,
        prompt: prompt,
        style: 'Авторская реставрация Ван Гога',
        year: 'AI Studio, ' + new Date().getFullYear(),
        description: textNote.trim() || `Изображение доработано по запросу: «${prompt}».`,
        palette: [
          { hex: '#0047AB', name: 'Синий' },
          { hex: '#FFD700', name: 'Золотой' },
          { hex: '#D4AF37', name: 'Охра' },
          { hex: '#1E3A8A', name: 'Кобальт' },
          { hex: '#F4A460', name: 'Холст' }
        ],
        brushstrokeNote: 'Синтез оригинального холста и новых пастозных штрихов по запросу автора.',
        aspectRatio: '1:1',
        createdAt: Date.now(),
        isUserCreated: true,
        modelUsed: requestedModel,
        likes: 1
      };

      sessionArtworks.unshift(editedArtwork);

      return res.json({
        success: true,
        artwork: editedArtwork
      });
    } catch (err: any) {
      console.error('Image edit error:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Ошибка обработки изображения'
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
        model: 'gemini-3.8-flash',
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
