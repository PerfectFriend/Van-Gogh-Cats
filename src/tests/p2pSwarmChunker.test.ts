import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeSha256, computeMerkleRoot } from '../utils/p2pSwarmChunker';

describe('P2P Swarm Chunker & Merkle Tree', () => {
  test('computeSha256 computes consistent 64-char hex digest', async () => {
    const hash1 = await computeSha256('van_gogh_cat_block_1');
    const hash2 = await computeSha256('van_gogh_cat_block_1');
    const hash3 = await computeSha256('van_gogh_cat_block_2');

    assert.equal(hash1, hash2, 'Identical inputs must yield identical hashes');
    assert.notEqual(hash1, hash3, 'Different inputs must yield different hashes');
    assert.equal(hash1.length, 64, 'SHA-256 hash must be 64 hexadecimal characters');
  });

  test('computeMerkleRoot handles empty and single leaf hashes safely', async () => {
    const emptyRoot = await computeMerkleRoot([]);
    assert.equal(emptyRoot, '', 'Empty array must return empty string');

    const singleHash = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const singleRoot = await computeMerkleRoot([singleHash]);
    assert.equal(singleRoot, singleHash, 'Single leaf should be its own root');
  });

  test('computeMerkleRoot produces deterministic tree for even number of chunks', async () => {
    const leaves = [
      await computeSha256('chunk_0'),
      await computeSha256('chunk_1'),
      await computeSha256('chunk_2'),
      await computeSha256('chunk_3'),
    ];

    const root1 = await computeMerkleRoot(leaves);
    const root2 = await computeMerkleRoot(leaves);

    assert.ok(root1, 'Merkle root must be generated');
    assert.equal(root1, root2, 'Merkle root calculation must be deterministic');
    assert.equal(root1.length, 64, 'Merkle root must be 64-char hash');
  });

  test('computeMerkleRoot properly handles odd number of chunks via balance duplication', async () => {
    const oddLeaves = [
      await computeSha256('chunk_0'),
      await computeSha256('chunk_1'),
      await computeSha256('chunk_2'),
    ];

    const root = await computeMerkleRoot(oddLeaves);
    assert.ok(root, 'Merkle root must be generated for odd leaves');
    assert.equal(root.length, 64);
  });

  test('detects tampered chunk modification in Merkle Root', async () => {
    const originalLeaves = [
      await computeSha256('original_stroke_data_0'),
      await computeSha256('original_stroke_data_1'),
    ];

    const tamperedLeaves = [
      await computeSha256('original_stroke_data_0'),
      await computeSha256('tampered_dog_attack_data_1'),
    ];

    const originalRoot = await computeMerkleRoot(originalLeaves);
    const tamperedRoot = await computeMerkleRoot(tamperedLeaves);

    assert.notEqual(
      originalRoot,
      tamperedRoot,
      'Tampered chunk must change the Merkle root, exposing corruption'
    );
  });
});
