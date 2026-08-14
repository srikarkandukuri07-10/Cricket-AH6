/**
 * State builder - assembles the full live match state from DB data.
 * Used by both public routes and after every ball is recorded.
 */
const db = require('../db/index');
const engine = require('../engine/cricketEngine');

/**
 * Build the full live state for a match.
 * @param {string} matchId
 * @returns {Object} state object (as defined in API contract)
 */
async function buildMatchState(matchId) {
  // 1. Match info
  const matchRes = await db.query(`
    SELECT m.*,
      ta.name as team_a_name, ta.short_name as team_a_short, ta.logo_url as team_a_logo, ta.primary_color as team_a_color,
      tb.name as team_b_name, tb.short_name as team_b_short, tb.logo_url as team_b_logo, tb.primary_color as team_b_color,
      tw.name as toss_winner_name,
      t.name as tournament_name, t.logo_url as tournament_logo
    FROM matches m
    LEFT JOIN teams ta ON m.team_a_id = ta.id
    LEFT JOIN teams tb ON m.team_b_id = tb.id
    LEFT JOIN teams tw ON m.toss_winner_team_id = tw.id
    LEFT JOIN tournaments t ON m.tournament_id = t.id
    WHERE m.id = $1
  `, [matchId]);

  if (matchRes.rows.length === 0) return null;
  const match = matchRes.rows[0];

  // Toss summary
  let tossSummary = null;
  if (match.toss_winner_team_id && match.toss_decision) {
    tossSummary = `${match.toss_winner_name} won the toss and elected to ${match.toss_decision}`;
  }

  // 2. Current/all innings
  const inningsRes = await db.query(`
    SELECT i.*,
      bt.name as batting_team_name, bt.short_name as batting_team_short, bt.logo_url as batting_team_logo, bt.primary_color as batting_team_color,
      bwt.name as bowling_team_name, bwt.short_name as bowling_team_short
    FROM innings i
    LEFT JOIN teams bt ON i.batting_team_id = bt.id
    LEFT JOIN teams bwt ON i.bowling_team_id = bwt.id
    WHERE i.match_id = $1
    ORDER BY i.innings_number ASC
  `, [matchId]);

  const allInnings = inningsRes.rows;
  const currentInnings = allInnings.find(i => !i.is_complete) || allInnings[allInnings.length - 1];

  // 3. Ball events for current innings
  let inningsState = null;
  let battingArr = [];
  let bowlingArr = [];
  let recentBalls = [];
  let overHistory = [];
  let fallOfWickets = [];
  let partnership = { runs: 0, balls: 0 };
  let currentStriker = null;
  let currentNonStriker = null;
  let currentBowler = null;
  let isFreeHit = false;
  let winProbability = null;
  let crr = 0, rrr = null, runsNeeded = null, ballsRemaining = null;

  if (currentInnings) {
    const ballsRes = await db.query(`
      SELECT be.*,
        ps.name as striker_name,
        pns.name as non_striker_name,
        pb.name as bowler_name,
        pd.name as dismissed_batter_name,
        pf.name as fielder_name,
        pns2.name as next_striker_name,
        pns3.name as next_non_striker_name
      FROM ball_events be
      LEFT JOIN players ps ON be.striker_id = ps.id
      LEFT JOIN players pns ON be.non_striker_id = pns.id
      LEFT JOIN players pb ON be.bowler_id = pb.id
      LEFT JOIN players pd ON be.dismissed_batter_id = pd.id
      LEFT JOIN players pf ON be.fielder_id = pf.id
      LEFT JOIN players pns2 ON be.next_striker_id = pns2.id
      LEFT JOIN players pns3 ON be.next_non_striker_id = pns3.id
      WHERE be.innings_id = $1
      ORDER BY be.sequence_number ASC
    `, [currentInnings.id]);

    const balls = ballsRes.rows;

    if (balls.length > 0) {
      inningsState = engine.computeInningsState(balls, {
        matchOvers: match.overs_per_innings,
        maxWickets: match.max_wickets,
        target: currentInnings.target,
      });

      // Build player name maps - pre-seed with all team players for 100% name accuracy
      const playerNames = {};
      const allPlayersRes = await db.query(
        `SELECT id, name FROM players WHERE team_id IN ($1, $2)`,
        [match.team_a_id, match.team_b_id]
      );
      allPlayersRes.rows.forEach(p => {
        playerNames[p.id] = p.name;
      });

      balls.forEach(b => {
        if (b.striker_id && b.striker_name) playerNames[b.striker_id] = b.striker_name;
        if (b.non_striker_id && b.non_striker_name) playerNames[b.non_striker_id] = b.non_striker_name;
        if (b.bowler_id && b.bowler_name) playerNames[b.bowler_id] = b.bowler_name;
        if (b.dismissed_batter_id && b.dismissed_batter_name) playerNames[b.dismissed_batter_id] = b.dismissed_batter_name;
        if (b.fielder_id && b.fielder_name) playerNames[b.fielder_id] = b.fielder_name;
        if (b.next_striker_id && b.next_striker_name) playerNames[b.next_striker_id] = b.next_striker_name;
        if (b.next_non_striker_id && b.next_non_striker_name) playerNames[b.next_non_striker_id] = b.next_non_striker_name;
      });

      // Build batting array (all batters who appeared, sorted by batting position)
      battingArr = Object.entries(inningsState.batting)
        .sort((a, b) => a[1].battingPosition - b[1].battingPosition)
        .map(([pid, stats]) => {
          const sr = stats.balls > 0 ? parseFloat(((stats.runs / stats.balls) * 100).toFixed(2)) : 0;
          const dismBowlerName = stats.dismissal?.bowlerId ? playerNames[stats.dismissal.bowlerId] : null;
          const dismFielderName = stats.dismissal?.fielderId ? playerNames[stats.dismissal.fielderId] : null;
          return {
            player_id: pid,
            name: playerNames[pid] || 'Unknown',
            runs: stats.runs,
            balls: stats.balls,
            fours: stats.fours,
            sixes: stats.sixes,
            sr,
            is_not_out: !stats.isOut,
            is_striker: pid === inningsState.currentStriker,
            is_non_striker: pid === inningsState.currentNonStriker,
            dismissal: stats.dismissal
              ? engine.formatDismissal(stats.dismissal.type, dismBowlerName, dismFielderName)
              : null,
            dismissal_type: stats.dismissal?.type || null,
            batting_position: stats.battingPosition,
          };
        });

      // Build bowling array
      bowlingArr = Object.entries(inningsState.bowling)
        .map(([pid, stats]) => {
          const overs = engine.formatOvers(stats.legalBalls);
          const eco = stats.legalBalls > 0
            ? parseFloat(((stats.runs / stats.legalBalls) * 6).toFixed(2))
            : 0;
          return {
            player_id: pid,
            name: playerNames[pid] || 'Unknown',
            legal_balls: stats.legalBalls,
            overs_display: overs,
            maidens: stats.maidens,
            runs_conceded: stats.runs,
            wickets: stats.wickets,
            economy: eco,
            wides: stats.wides,
            no_balls: stats.noballs,
            is_current: pid === inningsState.currentBowler,
          };
        })
        .sort((a, b) => b.legal_balls - a.legal_balls);

      recentBalls = inningsState.recentBalls;
      overHistory = inningsState.overHistory.map(oh => ({
        over_number: oh.overNumber,
        balls: oh.balls.map(b => ({
          display: engine.formatBallDisplay(b),
          is_wicket: b.is_wicket,
          extra_type: b.extra_type,
          is_legal: b.is_legal_delivery,
        })),
        runs_in_over: oh.runsInOver,
        wickets_in_over: oh.wicketsInOver,
      }));

      fallOfWickets = inningsState.fallOfWickets.map(fow => ({
        wicket_number: fow.wicketNumber,
        score_at_fall: fow.scoreAtFall,
        over_at_fall: fow.overAtFall,
        player_name: playerNames[fow.playerId] || 'Unknown',
        player_id: fow.playerId,
      }));

      partnership = inningsState.partnership;
      crr = inningsState.crr;
      rrr = inningsState.rrr;
      runsNeeded = inningsState.runsNeeded;
      ballsRemaining = inningsState.ballsRemaining;
      winProbability = inningsState.winProbability;
      isFreeHit = inningsState.isFreeHit;

      // Current striker/non-striker/bowler
      const lastBall = balls[balls.length - 1];
      if (lastBall) {
        if (inningsState.currentStriker) {
          const sData = inningsState.batting[inningsState.currentStriker];
          currentStriker = {
            player_id: inningsState.currentStriker,
            name: playerNames[inningsState.currentStriker] || 'Unknown',
            runs: sData?.runs || 0,
            balls: sData?.balls || 0,
            fours: sData?.fours || 0,
            sixes: sData?.sixes || 0,
            sr: sData?.balls > 0 ? parseFloat(((sData.runs / sData.balls) * 100).toFixed(2)) : 0,
          };
        }
        if (inningsState.currentNonStriker && inningsState.currentNonStriker !== inningsState.currentStriker) {
          const nsData = inningsState.batting[inningsState.currentNonStriker];
          currentNonStriker = {
            player_id: inningsState.currentNonStriker,
            name: playerNames[inningsState.currentNonStriker] || 'Unknown',
            runs: nsData?.runs || 0,
            balls: nsData?.balls || 0,
            fours: nsData?.fours || 0,
            sixes: nsData?.sixes || 0,
            sr: nsData?.balls > 0 ? parseFloat(((nsData.runs / nsData.balls) * 100).toFixed(2)) : 0,
          };
        }
        if (inningsState.currentBowler) {
          const bData = inningsState.bowling[inningsState.currentBowler];
          currentBowler = {
            player_id: inningsState.currentBowler,
            name: playerNames[inningsState.currentBowler] || 'Unknown',
            overs_display: bData ? engine.formatOvers(bData.legalBalls) : '0.0',
            runs_conceded: bData?.runs || 0,
            wickets: bData?.wickets || 0,
            maidens: bData?.maidens || 0,
            economy: bData?.legalBalls > 0 ? parseFloat(((bData.runs / bData.legalBalls) * 6).toFixed(2)) : 0,
          };
        }
      }
    } else if (currentInnings) {
      // 0 balls bowled yet — read initial player IDs from currentInnings
      const playerNames = {};
      const allPlayersRes = await db.query(
        `SELECT id, name FROM players WHERE team_id IN ($1, $2)`,
        [match.team_a_id, match.team_b_id]
      );
      allPlayersRes.rows.forEach(p => { playerNames[p.id] = p.name; });

      if (currentInnings.initial_striker_id) {
        currentStriker = {
          player_id: currentInnings.initial_striker_id,
          name: playerNames[currentInnings.initial_striker_id] || 'Striker',
          runs: 0, balls: 0, fours: 0, sixes: 0, sr: 0
        };
      }
      if (currentInnings.initial_non_striker_id && currentInnings.initial_non_striker_id !== currentInnings.initial_striker_id) {
        currentNonStriker = {
          player_id: currentInnings.initial_non_striker_id,
          name: playerNames[currentInnings.initial_non_striker_id] || 'Non-Striker',
          runs: 0, balls: 0, fours: 0, sixes: 0, sr: 0
        };
      }
      if (currentInnings.initial_bowler_id) {
        currentBowler = {
          player_id: currentInnings.initial_bowler_id,
          name: playerNames[currentInnings.initial_bowler_id] || 'Bowler',
          overs_display: '0.0', runs_conceded: 0, wickets: 0, maidens: 0, economy: 0
        };
      }
    }

    // Double safeguard: if striker and non-striker are identical, remove non-striker
    if (currentStriker && currentNonStriker && currentStriker.player_id === currentNonStriker.player_id) {
      currentNonStriker = null;
    }
  }

  // 4. Innings summary for all innings
  const inningsSummary = allInnings.map(i => ({
    innings_number: i.innings_number,
    batting_team_id: i.batting_team_id,
    batting_team_name: i.batting_team_name,
    batting_team_short: i.batting_team_short,
    total_runs: i.total_runs,
    total_wickets: i.total_wickets,
    total_legal_balls: i.total_legal_balls,
    overs_display: engine.formatOvers(i.total_legal_balls),
    is_complete: i.is_complete,
    target: i.target,
  }));

  return {
    match_id: matchId,
    status: match.status,
    name: match.name,
    venue: match.venue,
    tournament_name: match.tournament_name,
    scheduled_at: match.scheduled_at,
    overs_per_innings: match.overs_per_innings,
    max_wickets: match.max_wickets,
    free_hit_on_no_ball: match.free_hit_on_no_ball,
    team_a: {
      id: match.team_a_id,
      name: match.team_a_name,
      short_name: match.team_a_short,
      logo_url: match.team_a_logo,
      primary_color: match.team_a_color,
    },
    team_b: {
      id: match.team_b_id,
      name: match.team_b_name,
      short_name: match.team_b_short,
      logo_url: match.team_b_logo,
      primary_color: match.team_b_color,
    },
    toss_winner_team_id: match.toss_winner_team_id,
    toss_decision: match.toss_decision,
    toss_summary: tossSummary,
    batting_first_team_id: match.batting_first_team_id,
    result_text: match.result_text,
    man_of_match_player_id: match.man_of_match_player_id,
    notes: match.notes,
    innings_summary: inningsSummary,
    current_innings: currentInnings
      ? {
          id: currentInnings.id,
          innings_number: currentInnings.innings_number,
          batting_team_id: currentInnings.batting_team_id,
          batting_team_name: currentInnings.batting_team_name,
          batting_team_short: currentInnings.batting_team_short,
          batting_team_color: currentInnings.batting_team_color,
          bowling_team_id: currentInnings.bowling_team_id,
          bowling_team_name: currentInnings.bowling_team_name,
          bowling_team_short: currentInnings.bowling_team_short,
          total_runs: inningsState?.totalRuns ?? currentInnings.total_runs,
          total_wickets: inningsState?.totalWickets ?? currentInnings.total_wickets,
          total_legal_balls: inningsState?.totalLegalBalls ?? currentInnings.total_legal_balls,
          over_number: inningsState?.overNumber ?? 0,
          ball_in_over: inningsState?.ballInOver ?? 0,
          overs_display: inningsState?.oversDisplay ?? '0.0',
          extras: inningsState?.extras ?? { wides: 0, noballs: 0, byes: 0, legbyes: 0, total: 0 },
          target: currentInnings.target,
          runs_needed: runsNeeded,
          balls_remaining: ballsRemaining,
          crr,
          rrr,
          is_complete: currentInnings.is_complete,
        }
      : null,
    batting: battingArr,
    bowling: bowlingArr,
    current_striker: currentStriker,
    current_non_striker: currentNonStriker,
    current_bowler: currentBowler,
    recent_balls: recentBalls,
    over_history: overHistory,
    fall_of_wickets: fallOfWickets,
    partnership,
    win_probability: winProbability,
    is_free_hit: isFreeHit,
  };
}

module.exports = { buildMatchState };
