import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRatioMetrics, calculateAuditorWeight } from '../utils/p2pDispute';
import { AuditorVote } from '../types';

describe('P2P Dispute Resolution & 2:1 Quorum Consensus', () => {
  test('calculateAuditorWeight gives base weight 1 to regular peer', () => {
    const weight = calculateAuditorWeight({
      id: 'peer_novice',
      isAuditor: false,
      totalCreations: 1,
    });
    assert.equal(weight, 1, 'Novice peer must have base weight 1');
  });

  test('calculateAuditorWeight grants +2 for certified auditor and +1 for 3+ creations', () => {
    const auditorWeight = calculateAuditorWeight({
      id: 'peer_auditor',
      isAuditor: true,
      totalCreations: 1,
    });
    assert.equal(auditorWeight, 3, 'Certified auditor should have 1 + 2 = 3');

    const seniorAuditorWeight = calculateAuditorWeight({
      id: 'peer_senior',
      isAuditor: true,
      totalCreations: 5,
    });
    assert.equal(seniorAuditorWeight, 4, 'Senior auditor with creations should have 1 + 2 + 1 = 4');
  });

  test('requires at least 2 confirm votes and 2:1 weight ratio for condemnation', () => {
    // Case 1: Only 1 confirm vote, even with high weight -> NOT condemned yet
    const singleVote: AuditorVote[] = [
      {
        auditorId: 'peer_1',
        auditorName: 'Theo',
        decision: 'confirm',
        weight: 5,
        timestamp: Date.now(),
      },
    ];
    const metrics1 = calculateRatioMetrics(singleVote);
    assert.equal(metrics1.is2To1Condemned, false, 'Single vote must not condemn without quorum');

    // Case 2: 2 confirm votes with no rejections, total weight >= 3 -> CONDEMNED
    const quorumVotes: AuditorVote[] = [
      {
        auditorId: 'peer_1',
        auditorName: 'Theo',
        decision: 'confirm',
        weight: 2,
        timestamp: Date.now(),
      },
      {
        auditorId: 'peer_2',
        auditorName: 'Vincent',
        decision: 'confirm',
        weight: 1,
        timestamp: Date.now(),
      },
    ];
    const metrics2 = calculateRatioMetrics(quorumVotes);
    assert.equal(metrics2.is2To1Condemned, true, '2:1 quorum met with 2 confirmers');
    assert.equal(metrics2.confirmCount, 2);
    assert.equal(metrics2.confirmWeight, 3);
  });

  test('rejects condemnation if affirmative votes do not achieve 2:1 ratio over rejections', () => {
    // 2 confirms (weight 2 + 1 = 3), 1 reject (weight 2). Ratio is 3/2 = 1.5 (< 2.0)
    const contestVotes: AuditorVote[] = [
      {
        auditorId: 'peer_1',
        auditorName: 'Auditor A',
        decision: 'confirm',
        weight: 2,
        timestamp: Date.now(),
      },
      {
        auditorId: 'peer_2',
        auditorName: 'Auditor B',
        decision: 'confirm',
        weight: 1,
        timestamp: Date.now(),
      },
      {
        auditorId: 'peer_3',
        auditorName: 'Auditor C (Defense)',
        decision: 'reject',
        weight: 2,
        timestamp: Date.now(),
      },
    ];
    const metrics = calculateRatioMetrics(contestVotes);
    assert.equal(metrics.is2To1Condemned, false, '1.5 ratio must not condemn under 2:1 rule');
    assert.equal(metrics.ratio, 1.5);
  });

  test('acquits artwork and dismisses slanderous complaints when rejections outnumber 2:1', () => {
    // False complaint defended by community
    const defenseVotes: AuditorVote[] = [
      {
        auditorId: 'slanderer',
        auditorName: 'Malicious Peer',
        decision: 'confirm',
        weight: 1,
        timestamp: Date.now(),
      },
      {
        auditorId: 'peer_guard_1',
        auditorName: 'Defender 1',
        decision: 'reject',
        weight: 2,
        timestamp: Date.now(),
      },
      {
        auditorId: 'peer_guard_2',
        auditorName: 'Defender 2',
        decision: 'reject',
        weight: 2,
        timestamp: Date.now(),
      },
    ];
    const metrics = calculateRatioMetrics(defenseVotes);
    assert.equal(metrics.is2To1Acquitted, true, 'Acquitted when rejectWeight (4) >= confirmWeight (1) * 2');
    assert.equal(metrics.is2To1Condemned, false);
  });
});
