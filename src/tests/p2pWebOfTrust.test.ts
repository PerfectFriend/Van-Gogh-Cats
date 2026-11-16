import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTrustTier, calculateWoTJuryBonus } from '../utils/p2pWebOfTrust';
import { PeerEndorsement } from '../types';

describe('P2P Web of Trust (WoT) Promotion & Jury Bonuses', () => {
  test('returns novice_apprentice when endorsements count < 2', () => {
    const tier0 = calculateTrustTier([]);
    assert.equal(tier0, 'novice_apprentice');
    assert.equal(calculateWoTJuryBonus(tier0), 0);

    const singleEndorsement: PeerEndorsement[] = [
      {
        id: '1',
        endorserPeerId: 'p1',
        endorserName: 'Peer 1',
        endorserTier: 'novice_apprentice',
        subjectPeerId: 'sub',
        subjectPeerName: 'Subject',
        trustScoreAssigned: 5,
        statement: 'Good artist',
        digitalSignature: 'SIG_1',
        timestamp: Date.now(),
        txHash: '0x1',
      },
    ];
    const tier1 = calculateTrustTier(singleEndorsement);
    assert.equal(tier1, 'novice_apprentice');
    assert.equal(calculateWoTJuryBonus(tier1), 0);
  });

  test('promotes to trusted_artist with 2+ endorsements', () => {
    const twoEndorsements: PeerEndorsement[] = [
      {
        id: '1',
        endorserPeerId: 'p1',
        endorserName: 'Peer 1',
        endorserTier: 'novice_apprentice',
        subjectPeerId: 'sub',
        subjectPeerName: 'Subject',
        trustScoreAssigned: 5,
        statement: 'Good artist',
        digitalSignature: 'SIG_1',
        timestamp: Date.now(),
        txHash: '0x1',
      },
      {
        id: '2',
        endorserPeerId: 'p2',
        endorserName: 'Peer 2',
        endorserTier: 'novice_apprentice',
        subjectPeerId: 'sub',
        subjectPeerName: 'Subject',
        trustScoreAssigned: 5,
        statement: 'True cat lover',
        digitalSignature: 'SIG_2',
        timestamp: Date.now(),
        txHash: '0x2',
      },
    ];

    const tier = calculateTrustTier(twoEndorsements);
    assert.equal(tier, 'trusted_artist');
    assert.equal(calculateWoTJuryBonus(tier), 1);
  });

  test('promotes to master_post_impressionist with 4+ endorsements', () => {
    const fourEndorsements: PeerEndorsement[] = Array.from({ length: 4 }, (_, i) => ({
      id: `end_${i}`,
      endorserPeerId: `peer_${i}`,
      endorserName: `Artist ${i}`,
      endorserTier: 'trusted_artist',
      subjectPeerId: 'target',
      subjectPeerName: 'Target',
      trustScoreAssigned: 5,
      statement: 'Masterful impasto',
      digitalSignature: `sig_${i}`,
      timestamp: Date.now(),
      txHash: `0x${i}`,
    }));

    const tier = calculateTrustTier(fourEndorsements);
    assert.equal(tier, 'master_post_impressionist');
    assert.equal(calculateWoTJuryBonus(tier), 2);
  });

  test('promotes to guild_patriarch when endorsed by another patriarch with 4+ endorsements or 7+ total', () => {
    const patriarchEndorsements: PeerEndorsement[] = Array.from({ length: 4 }, (_, i) => ({
      id: `end_${i}`,
      endorserPeerId: `peer_${i}`,
      endorserName: `Artist ${i}`,
      endorserTier: i === 0 ? 'guild_patriarch' : 'trusted_artist',
      subjectPeerId: 'target',
      subjectPeerName: 'Target',
      trustScoreAssigned: 5,
      statement: 'Sublime palette',
      digitalSignature: `sig_${i}`,
      timestamp: Date.now(),
      txHash: `0x${i}`,
    }));

    const tier = calculateTrustTier(patriarchEndorsements);
    assert.equal(tier, 'guild_patriarch');
    assert.equal(calculateWoTJuryBonus(tier), 3);
  });
});
