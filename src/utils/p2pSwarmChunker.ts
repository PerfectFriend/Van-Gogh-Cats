import { Artwork, ArtworkChunk, SwarmTransferSession } from '../types';

// Compute SHA-256 hash string for text/binary data
export async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Compute Merkle Root from a list of chunk leaf hashes
export async function computeMerkleRoot(leafHashes: string[]): Promise<string> {
  if (!leafHashes || leafHashes.length === 0) return '';
  if (leafHashes.length === 1) return leafHashes[0];

  let currentLevel = [...leafHashes];
  // If odd number of leaves, duplicate the last one
  if (currentLevel.length % 2 !== 0) {
    currentLevel.push(currentLevel[currentLevel.length - 1]);
  }

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const combined = currentLevel[i] + currentLevel[i + 1];
      const parentHash = await computeSha256(combined);
      nextLevel.push(parentHash);
    }
    if (nextLevel.length > 1 && nextLevel.length % 2 !== 0) {
      nextLevel.push(nextLevel[nextLevel.length - 1]);
    }
    currentLevel = nextLevel;
  }

  return currentLevel[0];
}

// Chunk an artwork's image into manageable P2P blocks with Merkle verification
export async function createArtworkSwarmChunks(
  artwork: Artwork,
  chunkSizeBytes: number = 48 * 1024 // 48 KB per block
): Promise<{
  chunks: ArtworkChunk[];
  merkleRoot: string;
  totalBytes: number;
}> {
  const rawData = artwork.imageUrl;
  const totalLength = rawData.length;
  const totalChunks = Math.ceil(totalLength / chunkSizeBytes);
  const chunks: ArtworkChunk[] = [];
  const leafHashes: string[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSizeBytes;
    const end = Math.min(start + chunkSizeBytes, totalLength);
    const sliceData = rawData.slice(start, end);
    const chunkHash = await computeSha256(sliceData);

    leafHashes.push(chunkHash);
    chunks.push({
      index: i,
      totalChunks,
      chunkHash,
      data: sliceData,
      byteLength: sliceData.length,
      isVerified: true,
      status: 'verified',
    });
  }

  const merkleRoot = await computeMerkleRoot(leafHashes);

  return {
    chunks,
    merkleRoot,
    totalBytes: totalLength,
  };
}

// Reconstruct artwork image URL from ordered verified chunks
export function assembleChunksToArtworkImage(chunks: ArtworkChunk[]): string {
  const sorted = [...chunks].sort((a, b) => a.index - b.index);
  return sorted.map((c) => c.data).join('');
}

// Helper to simulate or execute swarm download from connected peers
export function createSwarmDownloadSession(
  artwork: Artwork,
  peerFriends: { peerId: string; name: string }[]
): Promise<SwarmTransferSession> {
  return createArtworkSwarmChunks(artwork).then(({ chunks, merkleRoot, totalBytes }) => {
    // For visualization / simulation of download:
    // Some chunks are marked idle, to be pulled from peers
    const swarmPeers = peerFriends.length > 0
      ? peerFriends.map((p) => ({
          peerId: p.peerId,
          name: p.name,
          speedKbps: Math.floor(450 + Math.random() * 850),
          chunksSeeded: 0,
        }))
      : [
          { peerId: 'peer_theo', name: 'Тео Ван Гог', speedKbps: 920, chunksSeeded: 0 },
          { peerId: 'peer_arles', name: 'Арльский Мурлыка', speedKbps: 640, chunksSeeded: 0 },
          { peerId: 'peer_gauguin', name: 'Поль Гоген', speedKbps: 780, chunksSeeded: 0 },
        ];

    return {
      id: `swarm_${artwork.id}_${Date.now()}`,
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      totalBytes,
      chunkSize: 48 * 1024,
      totalChunks: chunks.length,
      merkleRoot,
      chunks: chunks.map((c, idx) => ({
        ...c,
        isVerified: idx === 0, // first chunk already present as torrent seed
        status: idx === 0 ? 'verified' : 'idle',
        sourcePeerId: idx === 0 ? 'local' : undefined,
        sourcePeerName: idx === 0 ? 'Локальный сид' : undefined,
      })),
      activePeers: swarmPeers,
      isCompleted: false,
    };
  });
}
