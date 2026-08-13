/**
 * Cricket Scoring Engine
 * Pure functions — no side effects, no DB calls.
 * All match state is derived from ball_events array.
 */

/**
 * Is this delivery a legal ball (counts toward the over)?
 */
function isLegalDelivery(extraType) {
  return extraType !== 'wide' && extraType !== 'noball';
}

/**
 * Compute whether strike rotates after a delivery.
 * Also handles end-of-over forced rotation.
 *
 * @param {string} extraType - 'none'|'wide'|'noball'|'bye'|'legbye'
 * @param {number} batRuns   - runs credited to batter
 * @param {number} extraRuns - runs credited to extras
 * @param {boolean} isOverComplete - true if this was the 6th legal ball
 * @returns {boolean} - true if strike should rotate
 */
function computeStrikeRotation(extraType, batRuns, extraRuns, isOverComplete) {
  let rotate = false;

  if (extraType === 'wide') {
    // Wide: extra_runs includes 1 wide penalty + any additional runs from batsmen running
    // Strike rotates if physical crossing runs are odd (exclude the 1-run wide penalty)
    const physicalRuns = Math.max(0, extraRuns - 1);
    rotate = physicalRuns % 2 !== 0;
  } else if (extraType === 'noball') {
    // No ball: bat runs determine rotation
    rotate = batRuns % 2 !== 0;
  } else if (extraType === 'bye' || extraType === 'legbye') {
    // Bye/Leg bye: physical running determines rotation
    rotate = extraRuns % 2 !== 0;
  } else {
    // Normal delivery
    rotate = batRuns % 2 !== 0;
  }

  // End of over always produces one net strike change.
  // If the last ball already rotated, the over-end effect cancels it (net = no rotate from ball + rotate from over = same as end).
  // Actually the rule is: at end of over, non-striker ALWAYS faces next over.
  // So: if rotate was true (non-striker now striker), end-of-over = flip back? NO.
  // Correct rule: at end of every over, EXACTLY ONE additional rotation occurs.
  // This means: total rotations = ball_rotations + 1 (for end of over).
  // We XOR with true to flip.
  if (isOverComplete) {
    rotate = !rotate;
  }

  return rotate;
}

/**
 * Format overs as "X.Y" from legal ball count
 * e.g., 13 legal balls = "2.1"
 */
function formatOvers(legalBalls) {
  const overs = Math.floor(legalBalls / 6);
  const balls = legalBalls % 6;
  return `${overs}.${balls}`;
}

/**
 * Calculate current run rate
 */
function calcCRR(runs, legalBalls) {
  if (legalBalls === 0) return 0;
  return parseFloat(((runs / legalBalls) * 6).toFixed(2));
}

/**
 * Calculate required run rate
 */
function calcRRR(runsNeeded, ballsRemaining) {
  if (ballsRemaining <= 0) return 999;
  return parseFloat(((runsNeeded / ballsRemaining) * 6).toFixed(2));
}

/**
 * Calculate win probability (heuristic, transparent estimate).
 * Returns { batting: 0-100, bowling: 0-100 } always summing to 100.
 */
function calcWinProbability(state) {
  const { totalRuns, totalWickets, totalLegalBalls, target, maxWickets, totalOvers } = state;

  if (!target || target <= 0) return { batting: 50, bowling: 50 };

  const totalBalls = totalOvers * 6;
  const ballsRemaining = totalBalls - totalLegalBalls;
  const runsNeeded = target - totalRuns;
  const wicketsRemaining = maxWickets - totalWickets;

  if (runsNeeded <= 0) return { batting: 100, bowling: 0 };
  if (ballsRemaining <= 0 || wicketsRemaining <= 0) return { batting: 0, bowling: 100 };

  const crr = totalLegalBalls > 0 ? (totalRuns / totalLegalBalls) * 6 : 0;
  const rrr = (runsNeeded / ballsRemaining) * 6;

  // Resource factor: wickets remaining as proportion
  const resourceFactor = wicketsRemaining / maxWickets;

  // Rate ratio: how current rate compares to required rate
  // < 1 means batting is behind, > 1 means batting is ahead
  const rateRatio = rrr > 0 ? crr / rrr : 1;

  // Phase factor: pressure increases late in innings
  const progressFactor = totalLegalBalls / totalBalls;

  // Base probability considering all factors
  let battingProb;
  if (rateRatio >= 2) {
    battingProb = 85 + (resourceFactor * 10);
  } else if (rateRatio >= 1.5) {
    battingProb = 70 + (resourceFactor * 15);
  } else if (rateRatio >= 1.2) {
    battingProb = 60 + (resourceFactor * 15) - (progressFactor * 10);
  } else if (rateRatio >= 1.0) {
    battingProb = 50 + (resourceFactor * 15) - (progressFactor * 15);
  } else if (rateRatio >= 0.8) {
    battingProb = 35 + (resourceFactor * 20) - (progressFactor * 15);
  } else if (rateRatio >= 0.6) {
    battingProb = 20 + (resourceFactor * 15);
  } else {
    battingProb = 5 + (resourceFactor * 15);
  }

  // Clamp to 5-95
  battingProb = Math.max(5, Math.min(95, battingProb));
  battingProb = Math.round(battingProb);

  return { batting: battingProb, bowling: 100 - battingProb };
}

/**
 * Compute whether a bowler should be attributed the wicket.
 * Run outs are NOT attributed to the bowler.
 */
function bowlerGetsWicket(dismissalType) {
  if (!dismissalType) return false;
  const bowlerWickets = ['bowled', 'caught', 'lbw', 'stumped', 'hitwicket'];
  return bowlerWickets.includes(dismissalType);
}

/**
 * Build a human-readable dismissal string.
 */
function formatDismissal(dismissalType, bowlerName, fielderName) {
  if (!dismissalType) return 'not out';
  switch (dismissalType) {
    case 'bowled': return `b ${bowlerName || ''}`;
    case 'caught': return `c ${fielderName || ''} b ${bowlerName || ''}`;
    case 'lbw': return `lbw b ${bowlerName || ''}`;
    case 'runout': return `run out (${fielderName || ''})`;
    case 'stumped': return `st ${fielderName || ''} b ${bowlerName || ''}`;
    case 'hitwicket': return `hit wicket b ${bowlerName || ''}`;
    case 'retiredout': return 'retired out';
    default: return dismissalType;
  }
}

/**
 * Format a ball event for display in the recent balls widget.
 * Returns a short string like "1", "4", "6", "W", "WD", "NB", "•"
 */
function formatBallDisplay(ball) {
  if (ball.is_wicket) {
    if (ball.extra_type === 'noball') return 'NB+W';
    return 'W';
  }
  if (ball.extra_type === 'wide') {
    const total = ball.extra_runs;
    return total > 1 ? `WD+${total - 1}` : 'WD';
  }
  if (ball.extra_type === 'noball') {
    if (ball.bat_runs > 0) return `NB+${ball.bat_runs}`;
    return 'NB';
  }
  if (ball.extra_type === 'bye') return ball.extra_runs > 0 ? `B${ball.extra_runs}` : '•';
  if (ball.extra_type === 'legbye') return ball.extra_runs > 0 ? `LB${ball.extra_runs}` : '•';

  const total = ball.bat_runs;
  if (total === 0) return '•';
  return String(total);
}

/**
 * CORE FUNCTION: Compute full innings state from an array of ball events.
 *
 * @param {Array} balls - ball_events ordered by sequence_number ASC
 * @param {Object} opts - { matchOvers, maxWickets, target (for innings 2) }
 * @returns {Object} - complete innings state
 */
function computeInningsState(balls, opts = {}) {
  const { matchOvers = 10, maxWickets = 9, target = null } = opts;

  // --- Tracking variables ---
  let totalRuns = 0;
  let totalWickets = 0;
  let totalLegalBalls = 0;
  let extrasWides = 0;
  let extrasNoballs = 0;
  let extrasByes = 0;
  let extrasLegbyes = 0;

  // batting[playerId] = { runs, balls, fours, sixes, isOut, dismissal, battingPosition }
  const batting = {};
  // bowling[playerId] = { legalBalls, runs, wickets, maidens, wides, noballs, currentOverRuns }
  const bowling = {};
  // track order players appeared
  let battingPositionCounter = 0;

  const fallOfWickets = [];
  const overHistory = []; // array of { over_number, balls: [], runsInOver, wicketsInOver }
  let currentOverBalls = [];
  let currentOverRuns = 0;
  let currentOverWickets = 0;
  let currentOverNumber = 0;

  let currentStriker = null;
  let currentNonStriker = null;
  let currentBowler = null;
  let isFreeHit = false;

  // Partnership tracking
  let partnershipRuns = 0;
  let partnershipBalls = 0;
  let partnershipStartStriker = null;
  let partnershipStartNonStriker = null;

  for (const ball of balls) {
    const isLegal = isLegalDelivery(ball.extra_type);
    const totalBallRuns = ball.bat_runs + ball.extra_runs;
    const legalBallBefore = totalLegalBalls;

    // Initialize batter if first appearance
    if (ball.striker_id && !batting[ball.striker_id]) {
      battingPositionCounter++;
      batting[ball.striker_id] = {
        runs: 0, balls: 0, fours: 0, sixes: 0,
        isOut: false, dismissal: null,
        battingPosition: battingPositionCounter,
        playerId: ball.striker_id,
      };
    }
    if (ball.non_striker_id && !batting[ball.non_striker_id]) {
      battingPositionCounter++;
      batting[ball.non_striker_id] = {
        runs: 0, balls: 0, fours: 0, sixes: 0,
        isOut: false, dismissal: null,
        battingPosition: battingPositionCounter,
        playerId: ball.non_striker_id,
      };
    }

    // Initialize bowler
    if (ball.bowler_id && !bowling[ball.bowler_id]) {
      bowling[ball.bowler_id] = {
        legalBalls: 0, runs: 0, wickets: 0, maidens: 0,
        wides: 0, noballs: 0, currentOverRuns: 0,
        playerId: ball.bowler_id,
      };
    }

    // --- Update team score ---
    totalRuns += totalBallRuns;

    // --- Update extras ---
    if (ball.extra_type === 'wide') {
      extrasWides += ball.extra_runs;
      if (bowling[ball.bowler_id]) {
        bowling[ball.bowler_id].wides += ball.extra_runs;
        bowling[ball.bowler_id].runs += ball.extra_runs; // wides count against bowler
        bowling[ball.bowler_id].currentOverRuns += ball.extra_runs;
      }
    } else if (ball.extra_type === 'noball') {
      extrasNoballs += 1;
      if (bowling[ball.bowler_id]) {
        bowling[ball.bowler_id].noballs += 1;
        // NB penalty (1) + any bat runs count against bowler
        bowling[ball.bowler_id].runs += 1 + ball.bat_runs;
        bowling[ball.bowler_id].currentOverRuns += 1 + ball.bat_runs;
      }
    } else if (ball.extra_type === 'bye') {
      extrasByes += ball.extra_runs;
      // Byes do NOT count against bowler's economy
    } else if (ball.extra_type === 'legbye') {
      extrasLegbyes += ball.extra_runs;
      // Leg byes do NOT count against bowler's economy
    } else {
      // Normal delivery — bat runs against bowler
      if (bowling[ball.bowler_id]) {
        bowling[ball.bowler_id].runs += ball.bat_runs;
        bowling[ball.bowler_id].currentOverRuns += ball.bat_runs;
      }
    }

    // --- Update batter stats ---
    if (ball.striker_id && batting[ball.striker_id]) {
      // bat_runs credited to batter (not for byes/legbyes which have bat_runs=0 anyway)
      if (ball.extra_type !== 'wide') {
        // Wides: batter does NOT face, so no balls faced. But ball.bat_runs should be 0 for wide anyway.
        // For all other deliveries (including NB, bye, legbye), batter faces the ball.
        batting[ball.striker_id].balls++;
        if (ball.extra_type !== 'bye' && ball.extra_type !== 'legbye') {
          batting[ball.striker_id].runs += ball.bat_runs;
          if (ball.bat_runs === 4) batting[ball.striker_id].fours++;
          if (ball.bat_runs === 6) batting[ball.striker_id].sixes++;
        }
      }
    }

    // --- Legal ball tracking ---
    if (isLegal) {
      totalLegalBalls++;
      if (bowling[ball.bowler_id]) {
        bowling[ball.bowler_id].legalBalls++;
      }
    }

    // --- Wicket processing ---
    if (ball.is_wicket && ball.dismissed_batter_id) {
      totalWickets++;
      if (batting[ball.dismissed_batter_id]) {
        batting[ball.dismissed_batter_id].isOut = true;
        batting[ball.dismissed_batter_id].dismissal = {
          type: ball.dismissal_type,
          bowlerId: ball.bowler_gets_wicket ? ball.bowler_id : null,
          fielderId: ball.fielder_id,
        };
      }
      if (ball.bowler_gets_wicket && bowling[ball.bowler_id]) {
        bowling[ball.bowler_id].wickets++;
      }
      const overDisplay = `${Math.floor(totalLegalBalls / 6)}.${totalLegalBalls % 6}`;
      fallOfWickets.push({
        wicketNumber: totalWickets,
        scoreAtFall: totalRuns,
        overAtFall: overDisplay,
        playerId: ball.dismissed_batter_id,
      });
      // Reset partnership
      partnershipRuns = 0;
      partnershipBalls = 0;
    } else {
      // Update partnership
      partnershipRuns += totalBallRuns;
      if (isLegal) partnershipBalls++;
    }

    // --- Over tracking ---
    currentOverBalls.push(ball);
    if (ball.is_wicket) currentOverWickets++;
    if (ball.extra_type !== 'wide' && ball.extra_type !== 'noball') {
      currentOverRuns += totalBallRuns;
    } else if (ball.extra_type === 'wide' || ball.extra_type === 'noball') {
      currentOverRuns += totalBallRuns;
    }

    // Check if over complete (6 legal balls in current over)
    const ballsInCurrentOver = totalLegalBalls % 6;
    const justCompletedOver = isLegal && ballsInCurrentOver === 0 && totalLegalBalls > legalBallBefore;

    if (justCompletedOver) {
      // Maiden over check
      if (bowling[ball.bowler_id] && bowling[ball.bowler_id].currentOverRuns === 0) {
        bowling[ball.bowler_id].maidens++;
      }
      if (bowling[ball.bowler_id]) {
        bowling[ball.bowler_id].currentOverRuns = 0;
      }
      overHistory.push({
        overNumber: currentOverNumber,
        balls: [...currentOverBalls],
        runsInOver: currentOverRuns,
        wicketsInOver: currentOverWickets,
      });
      currentOverNumber = Math.floor(totalLegalBalls / 6);
      currentOverBalls = [];
      currentOverRuns = 0;
      currentOverWickets = 0;
    }

    // --- Track current positions ---
    currentStriker = ball.next_striker_id;
    currentNonStriker = ball.next_non_striker_id;
    currentBowler = ball.bowler_id;
    isFreeHit = ball.is_free_hit; // free hit on NEXT delivery
  }

  // Current over/ball position
  const overNumber = Math.floor(totalLegalBalls / 6);
  const ballInOver = totalLegalBalls % 6;
  const totalExtras = extrasWides + extrasNoballs + extrasByes + extrasLegbyes;

  // CRR / RRR
  const crr = calcCRR(totalRuns, totalLegalBalls);
  let runsNeeded = null;
  let ballsRemaining = null;
  let rrr = null;
  if (target !== null) {
    runsNeeded = target - totalRuns;
    ballsRemaining = (matchOvers * 6) - totalLegalBalls;
    rrr = calcRRR(runsNeeded, ballsRemaining);
  }

  // Win probability (only for 2nd innings)
  const winProbability = target
    ? calcWinProbability({ totalRuns, totalWickets, totalLegalBalls, target, maxWickets, totalOvers: matchOvers })
    : null;

  // Build recent balls (last 12 balls across current and previous over)
  const allBallsFlat = [...overHistory.flatMap(o => o.balls), ...currentOverBalls];
  const recentBalls = allBallsFlat.slice(-12).map(b => ({
    id: b.id,
    overNumber: b.over_number,
    ballInOver: b.ball_in_over,
    display: formatBallDisplay(b),
    batRuns: b.bat_runs,
    extraRuns: b.extra_runs,
    extraType: b.extra_type,
    isWicket: b.is_wicket,
    isLegal: b.is_legal_delivery,
    isFreeHit: b.is_free_hit,
    total: b.bat_runs + b.extra_runs,
  }));

  return {
    totalRuns,
    totalWickets,
    totalLegalBalls,
    overNumber,
    ballInOver,
    oversDisplay: formatOvers(totalLegalBalls),
    extras: {
      wides: extrasWides,
      noballs: extrasNoballs,
      byes: extrasByes,
      legbyes: extrasLegbyes,
      total: totalExtras,
    },
    batting, // keyed by player_id
    bowling, // keyed by player_id
    fallOfWickets,
    overHistory,
    currentOverBalls,
    currentStriker,
    currentNonStriker,
    currentBowler,
    isFreeHit,
    partnership: { runs: partnershipRuns, balls: partnershipBalls },
    crr,
    rrr,
    runsNeeded,
    ballsRemaining,
    target,
    winProbability,
    recentBalls,
  };
}

/**
 * Compute the next ball's position (over_number and ball_in_over).
 */
function getNextBallPosition(totalLegalBalls) {
  const overNumber = Math.floor(totalLegalBalls / 6);
  const ballInOver = (totalLegalBalls % 6) + 1; // 1-indexed: 1-6
  return { overNumber, ballInOver };
}

/**
 * Determine if this ball completes the over.
 * @param {boolean} isLegal - whether the delivery is legal
 * @param {number} totalLegalBallsBefore - legal balls BEFORE this delivery
 * @returns {boolean}
 */
function isOverCompletingBall(isLegal, totalLegalBallsBefore) {
  if (!isLegal) return false;
  return (totalLegalBallsBefore + 1) % 6 === 0;
}

/**
 * Check if innings is complete.
 */
function isInningsComplete(totalWickets, totalLegalBalls, maxWickets, matchOvers, target, totalRuns) {
  if (totalWickets >= maxWickets) return true;
  if (totalLegalBalls >= matchOvers * 6) return true;
  if (target !== null && totalRuns >= target) return true;
  return false;
}

/**
 * Compute match result text.
 */
function computeMatchResult(innings1, innings2, teamAName, teamBName, battingFirstTeamId, teamAId) {
  const i1Runs = innings1.total_runs;
  const i2Runs = innings2.total_runs;
  const i2Wickets = innings2.total_wickets;
  const maxWickets = innings2.max_wickets || 9;

  const battingSecondTeam = innings2.batting_team_id === teamAId ? teamAName : teamBName;
  const bowlingSecondTeam = innings2.batting_team_id === teamAId ? teamBName : teamAName;
  const battingFirstTeam = battingFirstTeamId === teamAId ? teamAName : teamBName;

  if (i2Runs > i1Runs) {
    const wicketsRemaining = maxWickets - i2Wickets;
    return `${battingSecondTeam} won by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
  } else if (i1Runs > i2Runs) {
    const runMargin = i1Runs - i2Runs;
    return `${battingFirstTeam} won by ${runMargin} run${runMargin !== 1 ? 's' : ''}`;
  } else {
    return 'Match tied';
  }
}

/**
 * Get max overs a bowler can bowl.
 * Default: ceil(totalOvers / 5), but configurable per match.
 */
function getMaxOversPerBowler(matchOvers, configuredMax) {
  if (configuredMax !== null && configuredMax !== undefined) return configuredMax;
  return Math.ceil(matchOvers / 5);
}

module.exports = {
  isLegalDelivery,
  computeStrikeRotation,
  formatOvers,
  calcCRR,
  calcRRR,
  calcWinProbability,
  bowlerGetsWicket,
  formatDismissal,
  formatBallDisplay,
  computeInningsState,
  getNextBallPosition,
  isOverCompletingBall,
  isInningsComplete,
  computeMatchResult,
  getMaxOversPerBowler,
};
