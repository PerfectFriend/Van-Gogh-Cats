import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateCatSwarmArchive, parseAndValidateCatArchive } from '../utils/p2pArchiveEngine';
import { Artwork, ArtistProfile } from '../types';

// Mock subtle crypto for Node environment if needed
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto');
  (globalThis as any).crypto = webcrypto;
}

describe('P2P Cat Swarm Archive Engine (.vangoghcat)', () => {
  const mockProfile: ArtistProfile = {
    id: 'peer_vincent_cat',
    name: 'Винсент Кот',
    avatarColor: 'from-amber-500 to-yellow-600',
    bio: 'Художник артели постимпрессионизма',
    createdAt: Date.now(),
    totalCreations: 1,
    likedArtworkIds: [],
  };

  const mockArtwork: Artwork = {
    id: 'cat_test_masterpiece_1',
    title: 'Звёздный Кот Сен-Реми',
    titleEn: 'Starry Cat of Saint-Rémy',
    imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    prompt: 'A fluffy cat under swirling starry night sky in Arles',
    style: 'Звёздная ночь (Starry Night)',
    year: '1889',
    description: 'Пастозные мазки кобальтом и золотом.',
    palette: [
      { hex: '#0047AB', name: 'Кобальт синий' },
      { hex: '#FFD700', name: 'Золотой хром' },
    ],
    brushstrokeNote: 'Густые динамичные мазки импасто.',
    aspectRatio: '1:1',
    createdAt: Date.now(),
    likes: 42,
    authorId: mockProfile.id,
    authorName: mockProfile.name,
  };

  test('generateCatSwarmArchive produces a valid archive with Merkle Root and Pigments Audit', async () => {
    const archive = await generateCatSwarmArchive([mockArtwork], mockProfile);

    assert.equal(archive.version, '1.0.0-rc');
    assert.equal(archive.authorPeerId, mockProfile.id);
    assert.equal(archive.authorName, mockProfile.name);
    assert.equal(archive.artworksCount, 1);
    assert.ok(archive.merkleMasterRoot.length > 0, 'Merkle Master Root should be computed');
    assert.ok(archive.artworks[0].merkleRoot.length > 0, 'Item Merkle Root should be computed');
    assert.ok(archive.artworks[0].vanGoghPigmentsAudit.hasChromeYellow, 'Should detect yellow pigment');
    assert.ok(archive.artworks[0].vanGoghPigmentsAudit.hasPrussianBlue, 'Should detect blue pigment');
  });

  test('parseAndValidateCatArchive correctly restores artworks and validates integrity', async () => {
    const archive = await generateCatSwarmArchive([mockArtwork], mockProfile);
    const jsonString = JSON.stringify(archive);

    const result = await parseAndValidateCatArchive(jsonString);

    assert.equal(result.valid, true);
    assert.equal(result.authorName, mockProfile.name);
    assert.equal(result.artworks.length, 1);
    assert.equal(result.artworks[0].id, mockArtwork.id);
    assert.equal(result.artworks[0].source, 'p2p-friend');
    assert.equal(result.artworks[0].isBackedUpLocally, true);
  });

  test('parseAndValidateCatArchive rejects corrupted payloads gracefully', async () => {
    const corruptedResult = await parseAndValidateCatArchive('{"invalid": true}');
    assert.equal(corruptedResult.valid, false);
    assert.equal(corruptedResult.artworks.length, 0);
  });
});
