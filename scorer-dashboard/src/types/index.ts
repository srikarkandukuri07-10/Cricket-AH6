export interface MatchState {
  match_id: string;
  status: 'upcoming'|'toss_pending'|'toss_complete'|'innings1_live'|'innings_break'|'innings2_live'|'completed'|'abandoned';
  name: string;
  team_a: { id: string; name: string; short_name: string; logo_url: string|null; primary_color: string; };
  team_b: { id: string; name: string; short_name: string; logo_url: string|null; primary_color: string; };
  toss_summary: string|null;
  batting_first_team_id: string|null;
  overs_per_innings: number;
  max_wickets: number;
  free_hit_on_no_ball: boolean;
  innings_summary: Array<{
    innings_number: number;
    batting_team_name: string;
    batting_team_short: string;
    total_runs: number;
    total_wickets: number;
    total_legal_balls: number;
    overs_display: string;
    is_complete: boolean;
  }>;
  current_innings: {
    id: string;
    innings_number: number;
    batting_team_id: string;
    batting_team_name: string;
    bowling_team_name: string;
    total_runs: number;
    total_wickets: number;
    total_legal_balls: number;
    overs_display: string;
    extras: { wides: number; noballs: number; byes: number; legbyes: number; total: number; };
    target: number|null;
    runs_needed: number|null;
    balls_remaining: number|null;
    crr: number;
    rrr: number|null;
    is_complete: boolean;
  } | null;
  batting: Array<{
    player_id: string;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    sr: number;
    is_not_out: boolean;
    is_striker: boolean;
    is_non_striker: boolean;
    dismissal: string|null;
    batting_position: number;
  }>;
  bowling: Array<{
    player_id: string;
    name: string;
    overs_display: string;
    maidens: number;
    runs_conceded: number;
    wickets: number;
    economy: number;
    wides: number;
    no_balls: number;
    is_current: boolean;
  }>;
  current_striker: { player_id: string; name: string; runs: number; balls: number; } | null;
  current_non_striker: { player_id: string; name: string; runs: number; balls: number; } | null;
  current_bowler: { player_id: string; name: string; overs_display: string; runs_conceded: number; wickets: number; } | null;
  recent_balls: Array<{ overNumber: number; ballInOver: number; display: string; isWicket: boolean; extraType: string; isLegal: boolean; isFreeHit: boolean; total: number; }>;
  fall_of_wickets: Array<{ wicket_number: number; score_at_fall: number; over_at_fall: string; player_name: string; }>;
  partnership: { runs: number; balls: number; };
  is_free_hit: boolean;
  result_text: string|null;
}

export interface User {
  id?: string;
  username?: string;
  email?: string;
  role: string;
}

export interface Player {
  id: string;
  name: string;
  jersey_number?: string;
  role?: string;
}

export interface Team {
  id: string;
  name: string;
  short_name: string;
  primary_color?: string;
  logo_url?: string | null;
}

export interface Match {
  id: string;
  name: string;
  status: string;
  team_a: Team;
  team_b: Team;
}
