import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  GitBranch, 
  ShieldCheck, 
  DownloadCloud, 
  UploadCloud, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Cpu, 
  Zap, 
  ServerOff,
  Radio,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { Artwork, SwarmTransferSession, ArtworkChunk, P2PFileTransferProgress } from '../types';
import { createSwarmDownloadSession, assembleChunksToArtworkImage, computeSha256 } from '../utils/p2pSwarmChunker';
import { p2pNetwork } from '../utils/p2pNetwork';
import { saveFriendBackupArtwork } from '../utils/p2pStorage';

interface P2PSwarmChunkerViewProps {
  artworks: Artwork[];
  peerFriends: { peerId: string; name: string }[];
}

export const P2PSwarmChunkerView: React.FC<P2PSwarmChunkerViewProps> = ({
  artworks = [],
  peerFriends = [],
}) => {
  const safeArtworks = artworks && artworks.length > 0 ? artworks : [];
  const [selectedArtworkId, setSelectedArtworkId] = useState<string>(safeArtworks[0]?.id || '');
  const [session, setSession] = useState<SwarmTransferSession | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [corruptedChunkIndex, setCorruptedChunkIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'merkle' | 'peers' | 'live'>('matrix');
  const [liveTransfers, setLiveTransfers] = useState<Record<string, P2PFileTransferProgress>>({});
  const [streamTargetPeerId, setStreamTargetPeerId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const activeArtwork = safeArtworks.find((a) => a.id === selectedArtworkId) || safeArtworks[0] || null;

  // Listen to real live P2P transfers
  useEffect(() => {
    const unsub = p2pNetwork.onTransferProgress((progress) => {
      setLiveTransfers((prev) => ({
        ...prev,
        [progress.transferId]: progress,
      }));
    });
    return unsub;
  }, []);

  // Initialize session when artwork changes
  useEffect(() => {
    if (activeArtwork) {
      createSwarmDownloadSession(activeArtwork, peerFriends).then((s) => {
        setSession(s);
        setCorruptedChunkIndex(null);
        setIsDownloading(false);
      });
    }
  }, [selectedArtworkId, activeArtwork, peerFriends]);

  // Trigger Real WebRTC Stream to selected peer
  const handleStartRealStream = async () => {
    if (!activeArtwork || !streamTargetPeerId || isStreaming) return;
    setIsStreaming(true);
    try {
      await p2pNetwork.sendArtworkStream(streamTargetPeerId, activeArtwork);
    } catch (err) {
      console.error('Error sending P2P stream:', err);
    } finally {
      setIsStreaming(false);
    }
  };

  // Simulate Swarm P2P Downloading (local Merkle simulation)
  const handleStartSwarmDownload = () => {
    if (!session || !activeArtwork || isDownloading) return;
    setIsDownloading(true);

    let currentIndex = 1;
    const interval = setInterval(() => {
      setSession((prev) => {
        if (!prev) return null;
        if (currentIndex >= prev.chunks.length) {
          clearInterval(interval);
          setIsDownloading(false);
          const fullImg = assembleChunksToArtworkImage(prev.chunks);
          return {
            ...prev,
            isCompleted: true,
            reconstructedImageUrl: fullImg,
            chunks: prev.chunks.map((c) => ({ ...c, status: 'verified', isVerified: true })),
          };
        }

        const nextChunks = [...prev.chunks];
        const assignedPeer = prev.activePeers[currentIndex % prev.activePeers.length];
        nextChunks[currentIndex] = {
          ...nextChunks[currentIndex],
          status: 'verified',
          isVerified: true,
          sourcePeerId: assignedPeer.peerId,
          sourcePeerName: assignedPeer.name,
        };

        const updatedPeers = prev.activePeers.map((p) =>
          p.peerId === assignedPeer.peerId
            ? { ...p, chunksSeeded: p.chunksSeeded + 1 }
            : p
        );

        currentIndex++;
        return {
          ...prev,
          chunks: nextChunks,
          activePeers: updatedPeers,
        };
      });
    }, 180);
  };

  // Test Merkle tamper detection
  const handleCorruptRandomChunk = async () => {
    if (!session || session.chunks.length < 2) return;
    const targetIdx = 1;
    setCorruptedChunkIndex(targetIdx);

    setSession((prev) => {
      if (!prev) return null;
      const nextChunks = [...prev.chunks];
      nextChunks[targetIdx] = {
        ...nextChunks[targetIdx],
        data: nextChunks[targetIdx].data + 'TAMPERED_BYTE_ATTACK',
        status: 'corrupted',
        isVerified: false,
      };
      return {
        ...prev,
        chunks: nextChunks,
      };
    });
  };

  // Self-heal corrupted chunk from another peer
  const handleHealChunk = async () => {
    if (!session || !activeArtwork || corruptedChunkIndex === null) return;
    const targetIdx = corruptedChunkIndex;
    
    // Re-fetch clean chunk from activeArtwork
    const { chunks } = await createSwarmDownloadSession(activeArtwork, peerFriends);
    const cleanChunk = chunks[targetIdx];

    setSession((prev) => {
      if (!prev) return null;
      const nextChunks = [...prev.chunks];
      nextChunks[targetIdx] = {
        ...cleanChunk,
        status: 'verified',
        isVerified: true,
        sourcePeerId: 'peer_healer',
        sourcePeerName: 'Резервный пир-сидер (Self-Healed)',
      };
      return {
        ...prev,
        chunks: nextChunks,
      };
    });
    setCorruptedChunkIndex(null);
  };

  const verifiedCount = session?.chunks.filter((c) => c.status === 'verified').length || 0;
  const progressPercent = session ? Math.round((verifiedCount / session.totalChunks) * 100) : 0;

  return (
    <div className="bg-amber-950/40 border border-amber-800/40 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-800/30 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              <Boxes className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-serif font-bold text-amber-100">
              Swarm Chunking & Merkle Root
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-amber-700/50 text-amber-300">
              Локальная симуляция роя (демо Merkle-проверки) + Реальный WebRTC
            </span>
          </div>
          <p className="text-sm text-amber-300/80 mt-1">
            Интерактивная демонстрация проверки дерева Меркла на чанках по 48 КБ и реальная передача файлов через WebRTC DataChannel во вкладке «Прямой WebRTC стриминг».
          </p>
        </div>

        {/* Artwork selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-300/70">Холст:</span>
          <select
            value={selectedArtworkId}
            onChange={(e) => setSelectedArtworkId(e.target.value)}
            className="bg-black/50 border border-amber-700/60 rounded-xl px-3 py-1.5 text-xs text-amber-100 font-medium focus:ring-1 focus:ring-yellow-400"
          >
            {safeArtworks.map((art) => (
              <option key={art.id} value={art.id}>
                {art.title.slice(0, 30)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats row */}
      {session && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-black/30 border border-amber-800/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
              <Layers className="w-3.5 h-3.5" />
              <span>Всего блоков</span>
            </div>
            <div className="text-lg font-bold text-amber-100 mt-1">
              {session.totalChunks} <span className="text-xs font-normal text-amber-300/60">({Math.round(session.totalBytes / 1024)} КБ)</span>
            </div>
          </div>

          <div className="bg-black/30 border border-amber-800/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400/80">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Верифицировано</span>
            </div>
            <div className="text-lg font-bold text-emerald-300 mt-1">
              {verifiedCount} / {session.totalChunks} ({progressPercent}%)
            </div>
          </div>

          <div className="bg-black/30 border border-amber-800/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-yellow-400/80">
              <Zap className="w-3.5 h-3.5" />
              <span>Сидеры в рое</span>
            </div>
            <div className="text-lg font-bold text-yellow-300 mt-1">
              {session.activePeers.length} пира
            </div>
          </div>

          <div className="bg-black/30 border border-amber-800/30 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-xs text-blue-400/80">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Merkle Root</span>
            </div>
            <div className="text-xs font-mono text-blue-300 mt-1 truncate" title={session.merkleRoot}>
              {session.merkleRoot.slice(0, 14)}...
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar & Actions */}
      <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-amber-800/20">
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-200 font-medium">Прогресс скачивания роем (Swarm Torrent):</span>
          <span className="font-bold text-amber-300">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-amber-800/40 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={handleStartSwarmDownload}
              disabled={isDownloading || progressPercent === 100}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-amber-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Симуляция скачки...' : progressPercent === 100 ? 'Холст собран!' : 'Запустить симуляцию роя'}</span>
            </button>

            <button
              onClick={handleCorruptRandomChunk}
              disabled={isDownloading || corruptedChunkIndex !== null}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800/50 text-red-200 text-xs transition-all disabled:opacity-40"
              title="Имитировать повреждение блока и проверку дерева Меркла"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Тест: Повредить блок #1</span>
            </button>

            {corruptedChunkIndex !== null && (
              <button
                onClick={handleHealChunk}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-bold text-xs animate-bounce shadow-md transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Самоисцелить блок из роя!</span>
              </button>
            )}
          </div>

          {/* Sub-tabs selector */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-amber-800/40 flex-wrap">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'matrix' ? 'bg-amber-600 text-amber-950 font-bold' : 'text-amber-300/80 hover:text-amber-100'
              }`}
            >
              Матрица блоков
            </button>
            <button
              onClick={() => setActiveTab('merkle')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'merkle' ? 'bg-amber-600 text-amber-950 font-bold' : 'text-amber-300/80 hover:text-amber-100'
              }`}
            >
              Дерево Меркла
            </button>
            <button
              onClick={() => setActiveTab('peers')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'peers' ? 'bg-amber-600 text-amber-950 font-bold' : 'text-amber-300/80 hover:text-amber-100'
              }`}
            >
              Сидеры роя ({session?.activePeers.length})
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'live' ? 'bg-amber-600 text-amber-950 font-bold' : 'text-amber-300/80 hover:text-amber-100'
              }`}
            >
              <Radio className="w-3 h-3 text-red-400 animate-pulse" />
              <span>Прямой WebRTC стриминг ({Object.keys(liveTransfers).length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab: Matrix of Chunks */}
      {activeTab === 'matrix' && session && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-amber-300/70 px-1">
            <span>Интерактивная карта блоков полотна:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Верифицирован
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 animate-pulse" /> Скачивается
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Скомпрометирован
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-700" /> Ожидает
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16 gap-2 p-3 bg-black/40 rounded-xl border border-amber-800/30 max-h-64 overflow-y-auto">
            {session.chunks.map((chunk) => {
              const isCorrupt = chunk.status === 'corrupted';
              const isDone = chunk.status === 'verified';
              const isIdle = chunk.status === 'idle';

              return (
                <div
                  key={chunk.index}
                  title={`Блок #${chunk.index} | Хэш: ${chunk.chunkHash.slice(0, 10)}... | Сидер: ${chunk.sourcePeerName || 'Ожидание'}`}
                  className={`relative p-2 rounded-lg border text-center transition-all cursor-pointer select-none ${
                    isCorrupt
                      ? 'bg-red-950 border-red-500 text-red-300 ring-2 ring-red-500 animate-pulse'
                      : isDone
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 hover:scale-105'
                      : isIdle
                      ? 'bg-zinc-900/60 border-zinc-700/40 text-zinc-500'
                      : 'bg-yellow-950/60 border-yellow-500/60 text-yellow-300 animate-pulse'
                  }`}
                >
                  <div className="text-[10px] font-mono font-bold">#{chunk.index}</div>
                  <div className="text-[8px] opacity-70 truncate">{chunk.chunkHash.slice(0, 4)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Merkle Tree Inspector */}
      {activeTab === 'merkle' && session && (
        <div className="p-4 bg-black/40 rounded-xl border border-amber-800/30 space-y-4">
          <div className="flex items-center gap-2 text-sm font-serif font-bold text-amber-200">
            <GitBranch className="w-4 h-4 text-yellow-400" />
            <span>Криптографическое Дерево Меркла (Merkle Tree Graph)</span>
          </div>
          <p className="text-xs text-amber-300/80">
            Дерево Меркла гарантирует, что ни один пир не сможет подменить ни единого пикселя шедевра. Любое изменение блока мгновенно меняет Merkle Root и блокируется роем.
          </p>

          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 rounded-lg bg-amber-900/30 border border-amber-500/40">
              <div className="text-amber-400 font-bold mb-1">🌲 MERKLE ROOT (Корень дерева):</div>
              <div className="text-yellow-200 break-all">{session.merkleRoot}</div>
            </div>

            <div className="p-3 rounded-lg bg-black/60 border border-amber-800/30 space-y-2">
              <div className="text-amber-300/80 font-bold">Листья дерева (Хэши первых 4 блоков):</div>
              {session.chunks.slice(0, 4).map((c) => (
                <div key={c.index} className="flex items-center justify-between text-[11px] text-amber-200/90 border-b border-amber-900/20 pb-1">
                  <span>Блок #{c.index}:</span>
                  <span className="text-emerald-400">{c.chunkHash}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Swarm Seeders List */}
      {activeTab === 'peers' && session && (
        <div className="p-4 bg-black/40 rounded-xl border border-amber-800/30 space-y-3">
          <div className="flex items-center gap-2 text-sm font-serif font-bold text-amber-200">
            <Cpu className="w-4 h-4 text-yellow-400" />
            <span>Активные друзья-сидеры в P2P рое</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {session.activePeers.map((peer) => (
              <div key={peer.peerId} className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-100 text-xs">{peer.name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
                <div className="text-[11px] text-amber-300/70">
                  Скорость отдачи: <span className="font-mono text-amber-200">{peer.speedKbps} КБ/с</span>
                </div>
                <div className="text-[11px] text-amber-300/70">
                  Отдано блоков: <span className="font-mono text-emerald-400 font-bold">{peer.chunksSeeded}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Real Live WebRTC DataChannel Streaming */}
      {activeTab === 'live' && (
        <div className="p-4 bg-black/40 rounded-xl border border-amber-800/30 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-serif font-bold text-amber-200">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <span>Реальный P2P WebRTC DataChannel Стриминг холстов</span>
            </div>
            <span className="text-xs text-amber-300/70">
              Размер блока: 48 КБ (Backpressure-контролируемый поток)
            </span>
          </div>

          {/* Peer selector & start transfer */}
          <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-200">
                Передать полотно «{activeArtwork?.title || 'Холст'}» напрямую другу:
              </div>
              <div className="text-[11px] text-amber-300/60">
                Данные изображения транслируются по чанкам с автоматической взаимной репликацией в IndexedDB получателя.
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={streamTargetPeerId}
                onChange={(e) => setStreamTargetPeerId(e.target.value)}
                className="bg-black/60 border border-amber-700/50 rounded-lg px-3 py-1.5 text-xs text-amber-100 focus:outline-none focus:border-yellow-500"
              >
                <option value="">-- Выберите друга онлайн --</option>
                {peerFriends.map((f) => (
                  <option key={f.peerId} value={f.peerId}>
                    {f.name} ({f.peerId.slice(0, 8)}...)
                  </option>
                ))}
              </select>

              <button
                onClick={handleStartRealStream}
                disabled={!streamTargetPeerId || isStreaming}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-amber-950 font-bold text-xs shadow transition-all disabled:opacity-50 whitespace-nowrap"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isStreaming ? 'Передача...' : 'Стримить'}</span>
              </button>
            </div>
          </div>

          {/* Active Live Transfers List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-amber-300/80">
              Активные и недавние P2P передачи:
            </div>

            {Object.keys(liveTransfers).length === 0 ? (
              <div className="p-4 rounded-xl bg-black/20 border border-dashed border-amber-800/30 text-center text-xs text-amber-300/50">
                Нет активных передач. Выберите подключенного пира и нажмите «Стримить» для отправки полотна по чанкам.
              </div>
            ) : (
              (Object.values(liveTransfers) as P2PFileTransferProgress[]).map((tx) => (
                <div
                  key={tx.transferId}
                  className="p-3.5 rounded-xl bg-black/50 border border-amber-800/40 space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {tx.direction === 'upload' ? (
                        <ArrowUpCircle className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                      )}
                      <span className="font-bold text-amber-100">{tx.artworkTitle}</span>
                      <span className="text-[11px] text-amber-300/60">
                        ({tx.direction === 'upload' ? `К пиру: ${tx.peerName}` : `От пира: ${tx.peerName}`})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-amber-300/80">{tx.speedKbps} Кбит/с</span>
                      <span className="text-amber-200">
                        {tx.receivedChunks} / {tx.totalChunks} чанков
                      </span>
                      {tx.isComplete ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          Завершено (Реплицировано)
                        </span>
                      ) : (
                        <span className="text-yellow-400 font-bold">{tx.progressPercent}%</span>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-amber-800/30">
                    <div
                      className={`h-full transition-all duration-150 ${
                        tx.isComplete
                          ? 'bg-emerald-400'
                          : tx.direction === 'upload'
                          ? 'bg-yellow-400'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${tx.progressPercent}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
