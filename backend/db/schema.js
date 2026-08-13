const db = require('./index');

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#e8461a',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INTEGER,
  role TEXT DEFAULT 'allrounder',
  is_captain BOOLEAN DEFAULT FALSE,
  is_wicketkeeper BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  team_a_id UUID REFERENCES teams(id),
  team_b_id UUID REFERENCES teams(id),
  name TEXT,
  venue TEXT,
  scheduled_at TIMESTAMPTZ,
  overs_per_innings INTEGER NOT NULL DEFAULT 10,
  max_wickets INTEGER NOT NULL DEFAULT 9,
  free_hit_on_no_ball BOOLEAN DEFAULT TRUE,
  max_overs_per_bowler INTEGER,
  status TEXT DEFAULT 'upcoming' CHECK(status IN (
    'upcoming','toss_pending','toss_complete',
    'innings1_live','innings_break','innings2_live',
    'completed','abandoned'
  )),
  toss_winner_team_id UUID REFERENCES teams(id),
  toss_decision TEXT CHECK(toss_decision IN ('bat','bowl')),
  batting_first_team_id UUID REFERENCES teams(id),
  bowling_first_team_id UUID REFERENCES teams(id),
  result_text TEXT,
  man_of_match_player_id UUID REFERENCES players(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  player_id UUID REFERENCES players(id),
  batting_order INTEGER,
  is_playing_xi BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, player_id)
);

CREATE TABLE IF NOT EXISTS innings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings_number INTEGER CHECK(innings_number IN (1,2)),
  batting_team_id UUID REFERENCES teams(id),
  bowling_team_id UUID REFERENCES teams(id),
  total_runs INTEGER DEFAULT 0,
  total_wickets INTEGER DEFAULT 0,
  total_legal_balls INTEGER DEFAULT 0,
  extras_wides INTEGER DEFAULT 0,
  extras_noballs INTEGER DEFAULT 0,
  extras_byes INTEGER DEFAULT 0,
  extras_legbyes INTEGER DEFAULT 0,
  target INTEGER,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ball_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id),
  over_number INTEGER NOT NULL DEFAULT 0,
  ball_in_over INTEGER NOT NULL DEFAULT 0,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  striker_id UUID REFERENCES players(id),
  non_striker_id UUID REFERENCES players(id),
  bowler_id UUID REFERENCES players(id),
  bat_runs INTEGER DEFAULT 0,
  extra_runs INTEGER DEFAULT 0,
  extra_type TEXT DEFAULT 'none' CHECK(extra_type IN ('none','wide','noball','bye','legbye')),
  is_legal_delivery BOOLEAN DEFAULT TRUE,
  is_wicket BOOLEAN DEFAULT FALSE,
  dismissal_type TEXT CHECK(dismissal_type IN ('bowled','caught','lbw','runout','stumped','hitwicket','retiredout') OR dismissal_type IS NULL),
  dismissed_batter_id UUID REFERENCES players(id),
  fielder_id UUID REFERENCES players(id),
  bowler_gets_wicket BOOLEAN DEFAULT FALSE,
  is_free_hit BOOLEAN DEFAULT FALSE,
  next_striker_id UUID REFERENCES players(id),
  next_non_striker_id UUID REFERENCES players(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ball_events_innings_seq ON ball_events(innings_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_ball_events_match ON ball_events(match_id);

CREATE TABLE IF NOT EXISTS fall_of_wickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  innings_id UUID REFERENCES innings(id) ON DELETE CASCADE,
  wicket_number INTEGER,
  score_at_fall INTEGER,
  over_at_fall TEXT,
  dismissed_player_id UUID REFERENCES players(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

async function initSchema() {
  try {
    await db.query(SCHEMA);
    // Remove legacy role constraint if exists so any role string is accepted
    await db.query(`ALTER TABLE players DROP CONSTRAINT IF EXISTS players_role_check`).catch(() => {});
    console.log('✅ Database schema initialized');
  } catch (err) {
    console.error('❌ Schema initialization failed:', err.message);
    throw err;
  }
}

module.exports = { initSchema };
