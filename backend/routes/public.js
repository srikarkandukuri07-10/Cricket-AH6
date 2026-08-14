const express = require('express');
const router = express.Router();
const db = require('../db/index');
const { buildMatchState } = require('../engine/stateBuilder');
const engine = require('../engine/cricketEngine');

// GET /api/tournaments
router.get('/tournaments', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tournaments ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/teams
router.get('/teams', async (req, res) => {
  try {
    const { tournament_id } = req.query;
    let query = 'SELECT * FROM teams';
    const params = [];
    if (tournament_id) {
      query += ' WHERE tournament_id = $1';
      params.push(tournament_id);
    }
    query += ' ORDER BY created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/teams/:teamId
router.get('/teams/:teamId', async (req, res) => {
  try {
    const teamRes = await db.query('SELECT * FROM teams WHERE id = $1', [req.params.teamId]);
    if (teamRes.rows.length === 0) return res.status(404).json({ error: 'Team not found' });

    const playersRes = await db.query(
      'SELECT * FROM players WHERE team_id = $1 ORDER BY jersey_number ASC, name ASC, created_at ASC',
      [req.params.teamId]
    );

    res.json({ ...teamRes.rows[0], players: playersRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/matches
router.get('/matches', async (req, res) => {
  try {
    const { status, tournament_id } = req.query;
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      if (status === 'live') {
        whereClause += ` AND m.status IN ('innings1_live','innings2_live')`;
      } else if (status === 'upcoming') {
        whereClause += ` AND m.status IN ('upcoming','toss_pending','toss_complete','innings_break')`;
      } else if (status === 'completed') {
        whereClause += ` AND m.status IN ('completed','abandoned')`;
      }
    }

    if (tournament_id) {
      params.push(tournament_id);
      whereClause += ` AND m.tournament_id = $${params.length}`;
    }

    const result = await db.query(`
      SELECT m.*,
        ta.name as team_a_name, ta.short_name as team_a_short, ta.logo_url as team_a_logo, ta.primary_color as team_a_color,
        tb.name as team_b_name, tb.short_name as team_b_short, tb.logo_url as team_b_logo, tb.primary_color as team_b_color,
        t.name as tournament_name
      FROM matches m
      LEFT JOIN teams ta ON m.team_a_id = ta.id
      LEFT JOIN teams tb ON m.team_b_id = tb.id
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      ${whereClause}
      ORDER BY m.scheduled_at DESC, m.created_at DESC
    `, params);

    // Add innings summary for each match
    const matchIds = result.rows.map(m => m.id);
    let inningsByMatch = {};

    if (matchIds.length > 0) {
      const inningsRes = await db.query(
        `SELECT i.*, t.name as batting_team_name, t.short_name as batting_team_short
         FROM innings i
         LEFT JOIN teams t ON i.batting_team_id = t.id
         WHERE i.match_id = ANY($1)
         ORDER BY i.innings_number ASC`,
        [matchIds]
      );
      inningsRes.rows.forEach(inn => {
        if (!inningsByMatch[inn.match_id]) inningsByMatch[inn.match_id] = [];
        inningsByMatch[inn.match_id].push({
          innings_number: inn.innings_number,
          batting_team_id: inn.batting_team_id,
          batting_team_name: inn.batting_team_name,
          batting_team_short: inn.batting_team_short,
          total_runs: inn.total_runs,
          total_wickets: inn.total_wickets,
          total_legal_balls: inn.total_legal_balls,
          overs_display: engine.formatOvers(inn.total_legal_balls),
          is_complete: inn.is_complete,
        });
      });
    }

    const matches = result.rows.map(m => ({
      id: m.id,
      name: m.name,
      venue: m.venue,
      scheduled_at: m.scheduled_at,
      status: m.status,
      result_text: m.result_text,
      tournament_id: m.tournament_id,
      tournament_name: m.tournament_name,
      overs_per_innings: m.overs_per_innings,
      team_a: { id: m.team_a_id, name: m.team_a_name, short_name: m.team_a_short, logo_url: m.team_a_logo, primary_color: m.team_a_color },
      team_b: { id: m.team_b_id, name: m.team_b_name, short_name: m.team_b_short, logo_url: m.team_b_logo, primary_color: m.team_b_color },
      toss_winner_team_id: m.toss_winner_team_id,
      toss_decision: m.toss_decision,
      innings_summary: inningsByMatch[m.id] || [],
    }));

    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/matches/:matchId
router.get('/matches/:matchId', async (req, res) => {
  try {
    const matchRes = await db.query(`
      SELECT m.*,
        ta.name as team_a_name, ta.short_name as team_a_short, ta.logo_url as team_a_logo, ta.primary_color as team_a_color,
        tb.name as team_b_name, tb.short_name as team_b_short, tb.logo_url as team_b_logo, tb.primary_color as team_b_color,
        tw.name as toss_winner_name,
        t.name as tournament_name
      FROM matches m
      LEFT JOIN teams ta ON m.team_a_id = ta.id
      LEFT JOIN teams tb ON m.team_b_id = tb.id
      LEFT JOIN teams tw ON m.toss_winner_team_id = tw.id
      LEFT JOIN tournaments t ON m.tournament_id = t.id
      WHERE m.id = $1
    `, [req.params.matchId]);

    if (matchRes.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchRes.rows[0];

    // Get squads
    const squadsRes = await db.query(`
      SELECT ms.*, p.name, p.jersey_number, p.role, p.is_captain, p.is_wicketkeeper, p.avatar_url, ms.team_id
      FROM match_squads ms
      JOIN players p ON ms.player_id = p.id
      WHERE ms.match_id = $1
      ORDER BY ms.batting_order ASC, p.name ASC
    `, [req.params.matchId]);

    const squads = { team_a: [], team_b: [] };
    squadsRes.rows.forEach(s => {
      const entry = {
        player_id: s.player_id,
        name: s.name,
        jersey_number: s.jersey_number,
        role: s.role,
        is_captain: s.is_captain,
        is_wicketkeeper: s.is_wicketkeeper,
        avatar_url: s.avatar_url,
        batting_order: s.batting_order,
        is_playing_xi: s.is_playing_xi,
      };
      if (s.team_id === match.team_a_id) squads.team_a.push(entry);
      else squads.team_b.push(entry);
    });

    let tossSummary = null;
    if (match.toss_winner_team_id && match.toss_decision) {
      tossSummary = `${match.toss_winner_name} won the toss and elected to ${match.toss_decision}`;
    }

    res.json({
      id: match.id,
      name: match.name,
      venue: match.venue,
      scheduled_at: match.scheduled_at,
      status: match.status,
      result_text: match.result_text,
      tournament_id: match.tournament_id,
      tournament_name: match.tournament_name,
      overs_per_innings: match.overs_per_innings,
      max_wickets: match.max_wickets,
      free_hit_on_no_ball: match.free_hit_on_no_ball,
      max_overs_per_bowler: match.max_overs_per_bowler,
      toss_winner_team_id: match.toss_winner_team_id,
      toss_decision: match.toss_decision,
      toss_summary: tossSummary,
      batting_first_team_id: match.batting_first_team_id,
      bowling_first_team_id: match.bowling_first_team_id,
      man_of_match_player_id: match.man_of_match_player_id,
      notes: match.notes,
      team_a: { id: match.team_a_id, name: match.team_a_name, short_name: match.team_a_short, logo_url: match.team_a_logo, primary_color: match.team_a_color },
      team_b: { id: match.team_b_id, name: match.team_b_name, short_name: match.team_b_short, logo_url: match.team_b_logo, primary_color: match.team_b_color },
      squads,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/matches/:matchId/state
router.get('/matches/:matchId/state', async (req, res) => {
  try {
    const state = await buildMatchState(req.params.matchId);
    if (!state) return res.status(404).json({ error: 'Match not found' });
    res.json(state);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/matches/:matchId/balls
router.get('/matches/:matchId/balls', async (req, res) => {
  try {
    const inningsRes = await db.query(
      'SELECT id FROM innings WHERE match_id = $1 ORDER BY innings_number',
      [req.params.matchId]
    );
    if (inningsRes.rows.length === 0) return res.json([]);

    const inningsIds = inningsRes.rows.map(i => i.id);
    const ballsRes = await db.query(`
      SELECT be.*,
        ps.name as striker_name,
        pns.name as non_striker_name,
        pb.name as bowler_name,
        pd.name as dismissed_batter_name,
        pf.name as fielder_name
      FROM ball_events be
      LEFT JOIN players ps ON be.striker_id = ps.id
      LEFT JOIN players pns ON be.non_striker_id = pns.id
      LEFT JOIN players pb ON be.bowler_id = pb.id
      LEFT JOIN players pd ON be.dismissed_batter_id = pd.id
      LEFT JOIN players pf ON be.fielder_id = pf.id
      WHERE be.innings_id = ANY($1)
      ORDER BY be.innings_id, be.sequence_number ASC
    `, [inningsIds]);

    res.json(ballsRes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to get squad or team players
async function getTeamPlayersForMatch(matchId, teamId) {
  // First check match_squads
  const squadRes = await db.query(`
    SELECT ms.player_id, p.name, p.role
    FROM match_squads ms
    JOIN players p ON ms.player_id = p.id
    WHERE ms.match_id = $1 AND ms.team_id = $2 AND ms.is_playing_xi = true
  `, [matchId, teamId]);

  if (squadRes.rows.length > 0) {
    return squadRes.rows;
  }

  // Fallback: get all players from the team
  const playersRes = await db.query(`
    SELECT id as player_id, name, role
    FROM players
    WHERE team_id = $1
    ORDER BY jersey_number ASC, name ASC
  `, [teamId]);

  return playersRes.rows;
}

// GET /api/admin/matches/:matchId/available-bowlers
router.get('/admin/matches/:matchId/available-bowlers', async (req, res) => {
  try {
    const matchRes = await db.query('SELECT * FROM matches WHERE id = $1', [req.params.matchId]);
    if (matchRes.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchRes.rows[0];

    // Determine bowling team
    let bowlingTeamId;
    const inningsRes = await db.query(
      'SELECT * FROM innings WHERE match_id = $1 AND is_complete = false ORDER BY innings_number DESC LIMIT 1',
      [req.params.matchId]
    );

    let innings = inningsRes.rows[0];

    if (innings) {
      bowlingTeamId = innings.bowling_team_id;
    } else {
      // Innings not started yet - determine from toss or team_b
      const firstInnings = await db.query('SELECT * FROM innings WHERE match_id = $1 AND innings_number = 1', [req.params.matchId]);
      if (firstInnings.rows.length > 0) {
        // Setting up Innings 2: bowling team is 1st innings batting team
        bowlingTeamId = firstInnings.rows[0].batting_team_id;
      } else {
        // Setting up Innings 1: determine from toss
        if (match.toss_winner_team_id && match.toss_decision) {
          const tossWinner = match.toss_winner_team_id;
          const otherTeam = match.team_a_id === tossWinner ? match.team_b_id : match.team_a_id;
          bowlingTeamId = match.toss_decision === 'bat' ? otherTeam : tossWinner;
        } else {
          bowlingTeamId = match.team_b_id;
        }
      }
    }

    const bowlersList = await getTeamPlayersForMatch(req.params.matchId, bowlingTeamId);

    if (!innings) {
      // Innings setup phase: all bowlers available
      return res.json(bowlersList.map(p => ({
        player_id: p.player_id,
        name: p.name,
        role: p.role,
        can_bowl: true,
        overs_bowled: 0,
        is_last_over_bowler: false,
      })));
    }

    // Get last bowler
    const lastBallRes = await db.query(
      'SELECT bowler_id FROM ball_events WHERE innings_id = $1 AND is_legal_delivery = true ORDER BY sequence_number DESC LIMIT 6',
      [innings.id]
    );

    let lastOverBowlerId = null;
    if (lastBallRes.rows.length === 6) {
      const bowlerCounts = {};
      lastBallRes.rows.forEach(b => {
        bowlerCounts[b.bowler_id] = (bowlerCounts[b.bowler_id] || 0) + 1;
      });
      const lastBowler = lastBallRes.rows[0].bowler_id;
      if (bowlerCounts[lastBowler] === 6) {
        lastOverBowlerId = lastBowler;
      }
    }

    const oversBowledRes = await db.query(`
      SELECT bowler_id, COUNT(*) as legal_balls
      FROM ball_events
      WHERE innings_id = $1 AND is_legal_delivery = true
      GROUP BY bowler_id
    `, [innings.id]);

    const oversBowled = {};
    oversBowledRes.rows.forEach(r => {
      oversBowled[r.bowler_id] = Math.floor(parseInt(r.legal_balls) / 6);
    });

    const maxOvers = engine.getMaxOversPerBowler(match.overs_per_innings, match.max_overs_per_bowler);

    const bowlers = bowlersList.map(p => ({
      player_id: p.player_id,
      name: p.name,
      role: p.role,
      overs_bowled: oversBowled[p.player_id] || 0,
      max_overs_per_bowler: maxOvers,
      can_bowl: p.player_id !== lastOverBowlerId && (oversBowled[p.player_id] || 0) < maxOvers,
      is_last_over_bowler: p.player_id === lastOverBowlerId,
    }));

    res.json(bowlers);
  } catch (err) {
    console.error('Available bowlers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/matches/:matchId/available-batters
router.get('/admin/matches/:matchId/available-batters', async (req, res) => {
  try {
    const matchRes = await db.query('SELECT * FROM matches WHERE id = $1', [req.params.matchId]);
    if (matchRes.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchRes.rows[0];

    // Determine batting team
    let battingTeamId;
    const inningsRes = await db.query(
      'SELECT * FROM innings WHERE match_id = $1 AND is_complete = false ORDER BY innings_number DESC LIMIT 1',
      [req.params.matchId]
    );

    let innings = inningsRes.rows[0];

    if (innings) {
      battingTeamId = innings.batting_team_id;
    } else {
      // Innings not started yet - determine from toss or team_a
      const firstInnings = await db.query('SELECT * FROM innings WHERE match_id = $1 AND innings_number = 1', [req.params.matchId]);
      if (firstInnings.rows.length > 0) {
        // Setting up Innings 2: batting team is 1st innings bowling team
        battingTeamId = firstInnings.rows[0].bowling_team_id;
      } else {
        // Setting up Innings 1: determine from toss
        if (match.toss_winner_team_id && match.toss_decision) {
          const tossWinner = match.toss_winner_team_id;
          const otherTeam = match.team_a_id === tossWinner ? match.team_b_id : match.team_a_id;
          battingTeamId = match.toss_decision === 'bat' ? tossWinner : otherTeam;
        } else {
          battingTeamId = match.team_a_id;
        }
      }
    }

    const battersList = await getTeamPlayersForMatch(req.params.matchId, battingTeamId);

    if (!innings) {
      // Innings setup phase: all batters in the team are available
      return res.json(battersList);
    }

    // Get players who have already batted or been dismissed
    const battedRes = await db.query(`
      SELECT DISTINCT striker_id as player_id FROM ball_events WHERE innings_id = $1
      UNION
      SELECT DISTINCT non_striker_id as player_id FROM ball_events WHERE innings_id = $1
      UNION
      SELECT DISTINCT dismissed_batter_id as player_id FROM ball_events WHERE innings_id = $1 AND dismissed_batter_id IS NOT NULL
    `, [innings.id]);

    const battedIds = new Set(battedRes.rows.map(r => r.player_id).filter(Boolean));

    // Get current active batsmen from last ball or initial positions
    const lastBallRes = await db.query(
      'SELECT next_striker_id, next_non_striker_id FROM ball_events WHERE innings_id = $1 ORDER BY sequence_number DESC LIMIT 1',
      [innings.id]
    );

    const currentBatsmen = new Set();
    if (lastBallRes.rows.length > 0) {
      const lb = lastBallRes.rows[0];
      if (lb.next_striker_id) currentBatsmen.add(lb.next_striker_id);
      if (lb.next_non_striker_id) currentBatsmen.add(lb.next_non_striker_id);
    } else {
      if (innings.initial_striker_id) currentBatsmen.add(innings.initial_striker_id);
      if (innings.initial_non_striker_id) currentBatsmen.add(innings.initial_non_striker_id);
    }

    // Return players who are not currently batting and have not batted/been dismissed yet
    const available = battersList.filter(p =>
      !currentBatsmen.has(p.player_id) && !battedIds.has(p.player_id)
    );

    res.json(available);
  } catch (err) {
    console.error('Available batters error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
