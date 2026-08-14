const express = require('express');
const router = express.Router();
const db = require('../db/index');
const { authMiddleware } = require('../middleware/auth');
const engine = require('../engine/cricketEngine');
const { buildMatchState } = require('../engine/stateBuilder');

// All admin routes require authentication
router.use(authMiddleware);

// ===================== TOURNAMENTS =====================

router.post('/tournaments', async (req, res) => {
  try {
    const { name, logo_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Tournament name required' });
    const result = await db.query(
      'INSERT INTO tournaments (name, logo_url) VALUES ($1, $2) RETURNING *',
      [name, logo_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/tournaments/:id', async (req, res) => {
  try {
    const { name, logo_url } = req.body;
    const result = await db.query(
      'UPDATE tournaments SET name = COALESCE($1, name), logo_url = COALESCE($2, logo_url) WHERE id = $3 RETURNING *',
      [name, logo_url, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================== TEAMS =====================

router.post('/teams', async (req, res) => {
  try {
    const { tournament_id, name, short_name, logo_url, primary_color, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name required' });
    const result = await db.query(
      'INSERT INTO teams (tournament_id, name, short_name, logo_url, primary_color, category) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [tournament_id || null, name, short_name || name.slice(0, 4).toUpperCase(), logo_url || null, primary_color || '#e8461a', category || 'adults']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/teams/:teamId', async (req, res) => {
  try {
    const { name, short_name, logo_url, primary_color, category } = req.body;
    const result = await db.query(
      `UPDATE teams SET
        name = COALESCE($1, name),
        short_name = COALESCE($2, short_name),
        logo_url = COALESCE($3, logo_url),
        primary_color = COALESCE($4, primary_color),
        category = COALESCE($5, category)
      WHERE id = $6 RETURNING *`,
      [name, short_name, logo_url, primary_color, category, req.params.teamId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/teams/:teamId', async (req, res) => {
  try {
    const teamId = req.params.teamId;
    await db.query('DELETE FROM ball_events WHERE match_id IN (SELECT id FROM matches WHERE team_a_id = $1 OR team_b_id = $1)', [teamId]);
    await db.query('DELETE FROM fall_of_wickets WHERE innings_id IN (SELECT id FROM innings WHERE batting_team_id = $1 OR bowling_team_id = $1)', [teamId]);
    await db.query('DELETE FROM innings WHERE batting_team_id = $1 OR bowling_team_id = $1', [teamId]);
    await db.query('DELETE FROM match_squads WHERE team_id = $1 OR match_id IN (SELECT id FROM matches WHERE team_a_id = $1 OR team_b_id = $1)', [teamId]);
    await db.query('DELETE FROM matches WHERE team_a_id = $1 OR team_b_id = $1', [teamId]);
    await db.query('DELETE FROM players WHERE team_id = $1', [teamId]);
    await db.query('DELETE FROM teams WHERE id = $1', [teamId]);
    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (err) {
    console.error('Delete team error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

router.delete('/teams/:teamId/players', async (req, res) => {
  try {
    await db.query('DELETE FROM players WHERE team_id = $1', [req.params.teamId]);
    res.json({ success: true, message: 'All squad players deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// ===================== PLAYERS =====================

router.post('/teams/:teamId/players', async (req, res) => {
  try {
    const { name, jersey_number, role, is_captain, is_wicketkeeper, avatar_url } = req.body;
    if (!name) return res.status(400).json({ error: 'Player name required' });
    let normRole = role || 'allrounder';
    if (normRole === 'wicketkeeper') normRole = 'allrounder'; // safe fallback for legacy db constraints
    const result = await db.query(
      `INSERT INTO players (team_id, name, jersey_number, role, is_captain, is_wicketkeeper, avatar_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.teamId, name, jersey_number || null, normRole,
       is_captain || false, is_wicketkeeper || false, avatar_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

router.put('/players/:playerId', async (req, res) => {
  try {
    const { name, jersey_number, role, is_captain, is_wicketkeeper, avatar_url } = req.body;
    let normRole = role;
    if (normRole === 'wicketkeeper') normRole = 'allrounder';
    const result = await db.query(
      `UPDATE players SET
        name = COALESCE($1, name),
        jersey_number = COALESCE($2, jersey_number),
        role = COALESCE($3, role),
        is_captain = COALESCE($4, is_captain),
        is_wicketkeeper = COALESCE($5, is_wicketkeeper),
        avatar_url = COALESCE($6, avatar_url)
      WHERE id = $7 RETURNING *`,
      [name, jersey_number, normRole, is_captain, is_wicketkeeper, avatar_url, req.params.playerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

router.delete('/players/:playerId', async (req, res) => {
  try {
    await db.query('DELETE FROM players WHERE id = $1', [req.params.playerId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================== MATCHES =====================

router.post('/matches', async (req, res) => {
  try {
    const {
      tournament_id, team_a_id, team_b_id, name, venue, scheduled_at,
      overs_per_innings, max_wickets, free_hit_on_no_ball, max_overs_per_bowler
    } = req.body;

    if (!team_a_id || !team_b_id) return res.status(400).json({ error: 'Both teams required' });

    const result = await db.query(
      `INSERT INTO matches (tournament_id, team_a_id, team_b_id, name, venue, scheduled_at,
        overs_per_innings, max_wickets, free_hit_on_no_ball, max_overs_per_bowler, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'toss_pending') RETURNING *`,
      [tournament_id || null, team_a_id, team_b_id,
       name || 'Match', venue || null, scheduled_at || null,
       overs_per_innings || 10,
       max_wickets !== undefined ? max_wickets : 9,
       free_hit_on_no_ball !== undefined ? free_hit_on_no_ball : true,
       max_overs_per_bowler || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/matches/:matchId', async (req, res) => {
  try {
    const { name, venue, scheduled_at, overs_per_innings, max_wickets, free_hit_on_no_ball, max_overs_per_bowler, status, notes } = req.body;
    const result = await db.query(
      `UPDATE matches SET
        name = COALESCE($1, name),
        venue = COALESCE($2, venue),
        scheduled_at = COALESCE($3, scheduled_at),
        overs_per_innings = COALESCE($4, overs_per_innings),
        max_wickets = COALESCE($5, max_wickets),
        free_hit_on_no_ball = COALESCE($6, free_hit_on_no_ball),
        max_overs_per_bowler = COALESCE($7, max_overs_per_bowler),
        status = COALESCE($8, status),
        notes = COALESCE($9, notes)
      WHERE id = $10 RETURNING *`,
      [name, venue, scheduled_at, overs_per_innings, max_wickets, free_hit_on_no_ball, max_overs_per_bowler, status, notes, req.params.matchId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/matches/:matchId/squads
router.post('/matches/:matchId/squads', async (req, res) => {
  try {
    const { team_a_squad, team_b_squad } = req.body;
    const matchId = req.params.matchId;

    // Delete existing squads
    await db.query('DELETE FROM match_squads WHERE match_id = $1', [matchId]);

    const allSquadMembers = [...(team_a_squad || []), ...(team_b_squad || [])];
    for (const s of allSquadMembers) {
      await db.query(
        `INSERT INTO match_squads (match_id, team_id, player_id, batting_order, is_playing_xi)
         SELECT $1, p.team_id, $2, $3, $4 FROM players p WHERE p.id = $2`,
        [matchId, s.player_id, s.batting_order || 0, s.is_playing_xi !== false]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/matches/:matchId/toss
router.post('/matches/:matchId/toss', async (req, res) => {
  try {
    const { toss_winner_team_id, toss_decision } = req.body;
    if (!toss_winner_team_id || !toss_decision) {
      return res.status(400).json({ error: 'Toss winner and decision required' });
    }

    const matchRes = await db.query('SELECT * FROM matches WHERE id = $1', [req.params.matchId]);
    if (matchRes.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchRes.rows[0];

    // Determine batting and bowling first teams
    let battingFirstTeamId, bowlingFirstTeamId;
    if (toss_decision === 'bat') {
      battingFirstTeamId = toss_winner_team_id;
      bowlingFirstTeamId = toss_winner_team_id === match.team_a_id ? match.team_b_id : match.team_a_id;
    } else {
      bowlingFirstTeamId = toss_winner_team_id;
      battingFirstTeamId = toss_winner_team_id === match.team_a_id ? match.team_b_id : match.team_a_id;
    }

    const result = await db.query(
      `UPDATE matches SET
        toss_winner_team_id = $1, toss_decision = $2,
        batting_first_team_id = $3, bowling_first_team_id = $4,
        status = 'toss_complete'
      WHERE id = $5 RETURNING *`,
      [toss_winner_team_id, toss_decision, battingFirstTeamId, bowlingFirstTeamId, req.params.matchId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/matches/:matchId/start-innings
router.post('/matches/:matchId/start-innings', async (req, res) => {
  try {
    const { striker_id, non_striker_id, bowler_id } = req.body;
    if (!striker_id || !non_striker_id || !bowler_id) {
      return res.status(400).json({ error: 'Striker, non-striker, and bowler required' });
    }
    if (striker_id === non_striker_id) {
      return res.status(400).json({ error: 'Striker and non-striker must be different players' });
    }

    const matchRes = await db.query('SELECT * FROM matches WHERE id = $1', [req.params.matchId]);
    if (matchRes.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const match = matchRes.rows[0];

    // Check if innings 1 or 2
    const existingInnings = await db.query(
      'SELECT * FROM innings WHERE match_id = $1 ORDER BY innings_number', [req.params.matchId]
    );

    let innings;
    let inningsNumber;

    if (existingInnings.rows.length === 0) {
      // Starting innings 1
      inningsNumber = 1;
      const battingTeamId = match.batting_first_team_id;
      const bowlingTeamId = match.bowling_first_team_id;
      const inningsResult = await db.query(
        `INSERT INTO innings (match_id, innings_number, batting_team_id, bowling_team_id, target)
         VALUES ($1, 1, $2, $3, NULL) RETURNING *`,
        [req.params.matchId, battingTeamId, bowlingTeamId]
      );
      innings = inningsResult.rows[0];
    } else {
      // Starting innings 2
      inningsNumber = 2;
      const inn2 = existingInnings.rows.find(i => i.innings_number === 2);
      if (inn2) {
        innings = inn2;
      } else {
        const inn1 = existingInnings.rows.find(i => i.innings_number === 1);
        const battingTeamId = match.bowling_first_team_id;
        const bowlingTeamId = match.batting_first_team_id;
        const target = (inn1 ? inn1.total_runs : 0) + 1;
        const inningsResult = await db.query(
          `INSERT INTO innings (match_id, innings_number, batting_team_id, bowling_team_id, target)
           VALUES ($1, 2, $2, $3, $4) RETURNING *`,
          [req.params.matchId, battingTeamId, bowlingTeamId, target]
        );
        innings = inningsResult.rows[0];
      }
    }

    // Update match status
    const newStatus = inningsNumber === 1 ? 'innings1_live' : 'innings2_live';
    await db.query('UPDATE matches SET status = $1 WHERE id = $2', [newStatus, req.params.matchId]);

    // Create the "start" sentinel ball event - used to track initial striker/non-striker/bowler
    // We insert a special "start" record with bat_runs=0, indicating who starts
    // This is actually done by recording an event that sets the initial positions.
    // Instead, we'll track via the innings start info stored separately.
    // For simplicity: store initial positions in a separate small table or
    // use the first ball to determine. Let's store as a special note in the innings.
    // BEST APPROACH: store as metadata in innings record
    await db.query(
      `ALTER TABLE innings ADD COLUMN IF NOT EXISTS initial_striker_id UUID REFERENCES players(id)`,
      []
    ).catch(() => {}); // ignore if already exists
    await db.query(
      `ALTER TABLE innings ADD COLUMN IF NOT EXISTS initial_non_striker_id UUID REFERENCES players(id)`,
      []
    ).catch(() => {});
    await db.query(
      `ALTER TABLE innings ADD COLUMN IF NOT EXISTS initial_bowler_id UUID REFERENCES players(id)`,
      []
    ).catch(() => {});

    await db.query(
      `UPDATE innings SET initial_striker_id = $1, initial_non_striker_id = $2, initial_bowler_id = $3 WHERE id = $4`,
      [striker_id, non_striker_id, bowler_id, innings.id]
    );

    const state = await buildMatchState(req.params.matchId);
    req.app.get('io').to(`match:${req.params.matchId}`).emit('score_update', {
      matchId: req.params.matchId,
      state,
    });

    res.json({ innings_id: innings.id, innings_number: inningsNumber, state });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================== BALL RECORDING (THE HEART) =====================

// POST /api/admin/innings/:inningsId/balls
router.post('/innings/:inningsId/balls', async (req, res) => {
  try {
    const {
      bat_runs = 0,
      extra_runs = 0,
      extra_type = 'none',
      is_wicket = false,
      dismissal_type = null,
      dismissed_batter_id = null,
      fielder_id = null,
      bowler_gets_wicket: bowlerWicket = null,
      new_batter_id = null,
      new_batter_is_striker = true,
      bowler_id: overrideBowlerId = null, // Scorer can override bowler for new over
      notes = null,
    } = req.body;

    // Validate
    const validExtraTypes = ['none', 'wide', 'noball', 'bye', 'legbye'];
    if (!validExtraTypes.includes(extra_type)) {
      return res.status(400).json({ error: 'Invalid extra_type' });
    }

    // Load innings
    const inningsRes = await db.query(`
      SELECT i.*, m.overs_per_innings, m.max_wickets, m.free_hit_on_no_ball, m.max_overs_per_bowler, m.id as match_id
      FROM innings i
      JOIN matches m ON i.match_id = m.id
      WHERE i.id = $1
    `, [req.params.inningsId]);

    if (inningsRes.rows.length === 0) return res.status(404).json({ error: 'Innings not found' });
    const innings = inningsRes.rows[0];

    if (innings.is_complete) {
      return res.status(400).json({ error: 'Innings is already complete', code: 'INNINGS_COMPLETE' });
    }

    // Get last ball to determine current striker/non-striker/bowler
    const lastBallRes = await db.query(
      `SELECT * FROM ball_events WHERE innings_id = $1 ORDER BY sequence_number DESC LIMIT 1`,
      [req.params.inningsId]
    );

    // Get initial positions from innings (set when innings started)
    const initRes = await db.query(
      `SELECT initial_striker_id, initial_non_striker_id, initial_bowler_id FROM innings WHERE id = $1`,
      [req.params.inningsId]
    );

    let currentStriker, currentNonStriker, currentBowler;

    if (lastBallRes.rows.length === 0) {
      // First ball of innings — use initial positions
      const init = initRes.rows[0] || {};
      currentStriker = init.initial_striker_id;
      currentNonStriker = init.initial_non_striker_id;
      currentBowler = init.initial_bowler_id;
    } else {
      const lb = lastBallRes.rows[0];
      currentStriker = lb.next_striker_id;
      currentNonStriker = lb.next_non_striker_id;
      currentBowler = lb.bowler_id;
    }

    // Allow scorer to override bowler (used when starting a new over)
    if (overrideBowlerId) {
      currentBowler = overrideBowlerId;
    }

    if (!currentStriker || !currentNonStriker || !currentBowler) {
      return res.status(400).json({ error: 'Match not properly set up. No striker/bowler found.', code: 'SETUP_ERROR' });
    }

    // Count legal balls to determine over position
    const legalCountRes = await db.query(
      'SELECT COUNT(*) as cnt FROM ball_events WHERE innings_id = $1 AND is_legal_delivery = true',
      [req.params.inningsId]
    );
    const totalLegalBallsBefore = parseInt(legalCountRes.rows[0].cnt);

    // Count all balls (for sequence number)
    const seqRes = await db.query(
      'SELECT COUNT(*) as cnt FROM ball_events WHERE innings_id = $1',
      [req.params.inningsId]
    );
    const nextSeq = parseInt(seqRes.rows[0].cnt) + 1;

    const isLegal = engine.isLegalDelivery(extra_type);
    const newTotalLegalBalls = totalLegalBallsBefore + (isLegal ? 1 : 0);

    // Determine over_number and ball_in_over for this delivery
    const overNumber = Math.floor(totalLegalBallsBefore / 6);
    const ballInOver = isLegal ? (totalLegalBallsBefore % 6) + 1 : 0; // 0 for illegal

    // Is this the completing ball of an over?
    const isOverComplete = isLegal && (newTotalLegalBalls % 6 === 0);

    // Check for free hit
    const prevBallRes = await db.query(
      `SELECT extra_type FROM ball_events WHERE innings_id = $1 ORDER BY sequence_number DESC LIMIT 1`,
      [req.params.inningsId]
    );
    const isFreeHit = innings.free_hit_on_no_ball &&
      prevBallRes.rows.length > 0 &&
      prevBallRes.rows[0].extra_type === 'noball';

    // Compute next free hit indicator (current ball is NB → next delivery is free hit)
    const nextIsFreeHit = innings.free_hit_on_no_ball && extra_type === 'noball';

    // Compute next striker/non-striker
    let nextStriker = currentStriker;
    let nextNonStriker = currentNonStriker;

    // Handle wicket: check who got out
    let dismissedBatter = dismissed_batter_id || (is_wicket ? currentStriker : null);
    let bWicket = bowlerWicket !== null ? bowlerWicket : engine.bowlerGetsWicket(dismissal_type);

    if (is_wicket && dismissedBatter) {
      // First apply rotation for any runs
      const rotates = engine.computeStrikeRotation(extra_type, bat_runs, extra_runs, false);
      if (rotates) {
        [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
      }

      // Apply end-of-over rotation for legal delivery
      if (isOverComplete) {
        [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
      }

      // Now handle new batter
      if (new_batter_id) {
        // Replace the dismissed batter
        if (nextStriker === dismissedBatter) {
          if (new_batter_is_striker !== false) {
            nextStriker = new_batter_id;
          } else {
            nextNonStriker = new_batter_id;
            [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker]; // swap to put new batter at right end
          }
        } else if (nextNonStriker === dismissedBatter) {
          if (new_batter_is_striker === true) {
            nextNonStriker = nextStriker;
            nextStriker = new_batter_id;
          } else {
            nextNonStriker = new_batter_id;
          }
        }
      } else {
        // Last wicket or no new batter specified — keep as is (innings will end)
      }
    } else {
      // No wicket: normal strike rotation
      const rotates = engine.computeStrikeRotation(extra_type, bat_runs, extra_runs, isOverComplete);
      if (rotates) {
        [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
      }
    }

    // Insert ball event
    const ballResult = await db.query(`
      INSERT INTO ball_events (
        innings_id, match_id, over_number, ball_in_over, sequence_number,
        striker_id, non_striker_id, bowler_id,
        bat_runs, extra_runs, extra_type, is_legal_delivery,
        is_wicket, dismissal_type, dismissed_batter_id, fielder_id, bowler_gets_wicket,
        is_free_hit, next_striker_id, next_non_striker_id, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
      RETURNING *
    `, [
      req.params.inningsId, innings.match_id, overNumber, ballInOver, nextSeq,
      currentStriker, currentNonStriker, currentBowler,
      bat_runs, extra_runs, extra_type, isLegal,
      is_wicket, dismissal_type || null, dismissedBatter || null, fielder_id || null, bWicket,
      isFreeHit, nextStriker, nextNonStriker, notes || null,
    ]);

    // Update innings totals (kept in sync for quick access)
    const totalRuns = bat_runs + extra_runs;
    const wicketIncrement = is_wicket ? 1 : 0;

    let extrasUpdate = '';
    if (extra_type === 'wide') extrasUpdate = `, extras_wides = extras_wides + ${extra_runs}`;
    else if (extra_type === 'noball') extrasUpdate = `, extras_noballs = extras_noballs + 1`;
    else if (extra_type === 'bye') extrasUpdate = `, extras_byes = extras_byes + ${extra_runs}`;
    else if (extra_type === 'legbye') extrasUpdate = `, extras_legbyes = extras_legbyes + ${extra_runs}`;

    await db.query(`
      UPDATE innings SET
        total_runs = total_runs + $1,
        total_wickets = total_wickets + $2,
        total_legal_balls = total_legal_balls + $3
        ${extrasUpdate}
      WHERE id = $4
    `, [totalRuns, wicketIncrement, isLegal ? 1 : 0, req.params.inningsId]);

    // Fall of wicket
    if (is_wicket && dismissedBatter) {
      const totalRunsNow = (await db.query('SELECT total_runs FROM innings WHERE id = $1', [req.params.inningsId])).rows[0].total_runs;
      const wicketNum = (await db.query('SELECT total_wickets FROM innings WHERE id = $1', [req.params.inningsId])).rows[0].total_wickets;
      const overDisplay = `${overNumber}.${ballInOver}`;
      await db.query(
        `INSERT INTO fall_of_wickets (innings_id, wicket_number, score_at_fall, over_at_fall, dismissed_player_id)
         VALUES ($1,$2,$3,$4,$5)`,
        [req.params.inningsId, wicketNum, totalRunsNow, overDisplay, dismissedBatter]
      );
    }

    // Check innings completion
    const updatedInnings = (await db.query('SELECT * FROM innings WHERE id = $1', [req.params.inningsId])).rows[0];
    const target = updatedInnings.target;
    const inningsComplete = engine.isInningsComplete(
      updatedInnings.total_wickets,
      updatedInnings.total_legal_balls,
      innings.max_wickets,
      innings.overs_per_innings,
      target,
      updatedInnings.total_runs
    );

    if (inningsComplete) {
      await db.query('UPDATE innings SET is_complete = true WHERE id = $1', [req.params.inningsId]);

      if (innings.innings_number === 1) {
        // End of first innings — go to break
        await db.query('UPDATE matches SET status = $1 WHERE id = $2', ['innings_break', innings.match_id]);

        // Auto-create innings 2 record with calculated target so target tracking works immediately
        const targetRuns = updatedInnings.total_runs + 1;
        const inn2Check = await db.query('SELECT * FROM innings WHERE match_id = $1 AND innings_number = 2', [innings.match_id]);
        if (inn2Check.rows.length === 0) {
          const matchInfo = (await db.query('SELECT * FROM matches WHERE id = $1', [innings.match_id])).rows[0];
          const battingTeamId = matchInfo.bowling_first_team_id;
          const bowlingTeamId = matchInfo.batting_first_team_id;
          await db.query(
            `INSERT INTO innings (match_id, innings_number, batting_team_id, bowling_team_id, target)
             VALUES ($1, 2, $2, $3, $4)`,
            [innings.match_id, battingTeamId, bowlingTeamId, targetRuns]
          );
        } else {
          await db.query('UPDATE innings SET target = $1 WHERE id = $2', [targetRuns, inn2Check.rows[0].id]);
        }
      } else {
        // End of second innings — match complete
        const inn1Res = await db.query(
          'SELECT * FROM innings WHERE match_id = $1 AND innings_number = 1', [innings.match_id]
        );
        const inn2Res = await db.query(
          'SELECT * FROM innings WHERE match_id = $1 AND innings_number = 2', [innings.match_id]
        );
        const matchInfoRes = await db.query(
          'SELECT * FROM matches WHERE id = $1', [innings.match_id]
        );
        const mi = matchInfoRes.rows[0];

        // Get team names for result
        const ta = (await db.query('SELECT name FROM teams WHERE id = $1', [mi.team_a_id])).rows[0];
        const tb = (await db.query('SELECT name FROM teams WHERE id = $1', [mi.team_b_id])).rows[0];

        const resultText = engine.computeMatchResult(
          { ...inn1Res.rows[0], max_wickets: innings.max_wickets },
          { ...inn2Res.rows[0], max_wickets: innings.max_wickets },
          ta.name,
          tb.name,
          mi.batting_first_team_id,
          mi.team_a_id
        );

        await db.query(
          'UPDATE matches SET status = $1, result_text = $2 WHERE id = $3',
          ['completed', resultText, innings.match_id]
        );
      }

      // Emit innings/match complete event
      req.app.get('io').to(`match:${innings.match_id}`).emit('match_status_change', {
        matchId: innings.match_id,
        innings_number: innings.innings_number,
        innings_complete: true,
      });
    }

    // Build and emit state
    const state = await buildMatchState(innings.match_id);
    req.app.get('io').to(`match:${innings.match_id}`).emit('score_update', {
      matchId: innings.match_id,
      state,
    });

    // Emit over complete event if needed
    if (isOverComplete) {
      req.app.get('io').to(`match:${innings.match_id}`).emit('over_complete', {
        matchId: innings.match_id,
        over_number: overNumber,
      });
    }

    res.json({ ball_event: ballResult.rows[0], state });
  } catch (err) {
    console.error('Ball recording error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// DELETE /api/admin/innings/:inningsId/balls/last - UNDO
router.delete('/innings/:inningsId/balls/last', async (req, res) => {
  try {
    // Get last ball
    const lastBallRes = await db.query(
      `SELECT * FROM ball_events WHERE innings_id = $1 ORDER BY sequence_number DESC LIMIT 1`,
      [req.params.inningsId]
    );

    if (lastBallRes.rows.length === 0) {
      return res.status(400).json({ error: 'No balls to undo', code: 'NO_BALLS' });
    }

    const lastBall = lastBallRes.rows[0];

    // Get innings to find match_id
    const inningsRes = await db.query('SELECT * FROM innings WHERE id = $1', [req.params.inningsId]);
    const innings = inningsRes.rows[0];

    // Delete the ball
    await db.query('DELETE FROM ball_events WHERE id = $1', [lastBall.id]);

    // Delete fall of wicket if this was a wicket
    if (lastBall.is_wicket) {
      await db.query(
        `DELETE FROM fall_of_wickets WHERE innings_id = $1 AND dismissed_player_id = $2
         AND id = (SELECT id FROM fall_of_wickets WHERE innings_id = $1 AND dismissed_player_id = $2 ORDER BY created_at DESC LIMIT 1)`,
        [req.params.inningsId, lastBall.dismissed_batter_id]
      );
    }

    // Recompute innings totals from scratch (most reliable for undo)
    const allBallsRes = await db.query(
      'SELECT * FROM ball_events WHERE innings_id = $1 ORDER BY sequence_number ASC',
      [req.params.inningsId]
    );

    const matchRes = await db.query('SELECT * FROM matches WHERE id = $1', [innings.match_id]);
    const match = matchRes.rows[0];

    const state = engine.computeInningsState(allBallsRes.rows, {
      matchOvers: match.overs_per_innings,
      maxWickets: match.max_wickets,
      target: innings.target,
    });

    // Update innings with recomputed totals
    await db.query(`
      UPDATE innings SET
        total_runs = $1,
        total_wickets = $2,
        total_legal_balls = $3,
        extras_wides = $4,
        extras_noballs = $5,
        extras_byes = $6,
        extras_legbyes = $7,
        is_complete = false
      WHERE id = $8
    `, [
      state.totalRuns,
      state.totalWickets,
      state.totalLegalBalls,
      state.extras.wides,
      state.extras.noballs,
      state.extras.byes,
      state.extras.legbyes,
      req.params.inningsId,
    ]);

    // If innings was complete, re-open it and reset match status
    if (innings.is_complete) {
      const prevStatus = innings.innings_number === 1 ? 'innings1_live' : 'innings2_live';
      await db.query('UPDATE matches SET status = $1, result_text = NULL WHERE id = $2', [prevStatus, innings.match_id]);
    }

    const fullState = await buildMatchState(innings.match_id);
    req.app.get('io').to(`match:${innings.match_id}`).emit('score_update', {
      matchId: innings.match_id,
      state: fullState,
    });

    res.json({ deleted_ball: lastBall, state: fullState });
  } catch (err) {
    console.error('Undo error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/admin/innings/:inningsId/complete - Manual innings end
router.post('/innings/:inningsId/complete', async (req, res) => {
  try {
    const inningsRes = await db.query('SELECT * FROM innings WHERE id = $1', [req.params.inningsId]);
    if (inningsRes.rows.length === 0) return res.status(404).json({ error: 'Innings not found' });
    const innings = inningsRes.rows[0];

    await db.query('UPDATE innings SET is_complete = true WHERE id = $1', [req.params.inningsId]);

    if (innings.innings_number === 1) {
      await db.query('UPDATE matches SET status = $1 WHERE id = $2', ['innings_break', innings.match_id]);
    } else {
      await db.query('UPDATE matches SET status = $1 WHERE id = $2', ['completed', innings.match_id]);
    }

    const state = await buildMatchState(innings.match_id);
    req.app.get('io').to(`match:${innings.match_id}`).emit('score_update', {
      matchId: innings.match_id,
      state,
    });

    res.json({ success: true, state });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/matches/:matchId/result
router.put('/matches/:matchId/result', async (req, res) => {
  try {
    const { result_text, man_of_match_player_id, notes } = req.body;
    const result = await db.query(
      `UPDATE matches SET
        result_text = COALESCE($1, result_text),
        man_of_match_player_id = COALESCE($2, man_of_match_player_id),
        notes = COALESCE($3, notes),
        status = 'completed'
      WHERE id = $4 RETURNING *`,
      [result_text, man_of_match_player_id, notes, req.params.matchId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Match not found' });

    const state = await buildMatchState(req.params.matchId);
    req.app.get('io').to(`match:${req.params.matchId}`).emit('score_update', {
      matchId: req.params.matchId,
      state,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/innings/:inningsId/change-bowler (for mid-over changes, rare)
router.post('/innings/:inningsId/change-bowler', async (req, res) => {
  try {
    const { bowler_id } = req.body;
    // This doesn't change any ball events — just updates the current bowler
    // for the next ball recording. The client tracks this via the last ball's bowler_id.
    // We don't need to store this separately; it's handled naturally because
    // the scorer selects bowler which is then passed with the next ball.
    // This endpoint exists as a hook for future use.
    res.json({ success: true, new_bowler_id: bowler_id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/matches/:matchId (Danger Zone: Delete Ongoing/Completed Match)
router.delete('/matches/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const matchRes = await db.query('SELECT * FROM matches WHERE id = $1', [matchId]);
    if (matchRes.rows.length === 0) return res.status(404).json({ error: 'Match not found' });

    // Clean up all related records
    await db.query('DELETE FROM ball_events WHERE match_id = $1', [matchId]);
    await db.query('DELETE FROM innings WHERE match_id = $1', [matchId]);
    await db.query('DELETE FROM match_squads WHERE match_id = $1', [matchId]).catch(() => {});
    await db.query('DELETE FROM matches WHERE id = $1', [matchId]);

    // Emit real-time socket notification
    if (req.app.get('io')) {
      req.app.get('io').to(`match:${matchId}`).emit('match_status_change', {
        matchId,
        status: 'deleted',
      });
    }

    res.json({ success: true, message: 'Match deleted successfully' });
  } catch (err) {
    console.error('Delete match error:', err);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

module.exports = router;
