export interface MatchState {
  match_id: string;
  status: string; // 'upcoming'|'toss_pending'|'toss_complete'|'innings1_live'|'innings_break'|'innings2_live'|'completed'|'abandoned'
  name: string;
  venue: string;
  tournament_name: string;
  team_a: { id: string; name: string; short_name: string; logo_url: string|null; primary_color: string; };
  team_b: { id: string; name: string; short_name: string; logo_url: string|null; primary_color: string; };
  toss_summary: string|null;
  batting_first_team_id: string|null;
  overs_per_innings: number;
  max_wickets: number;
  innings_summary: Array<{
    innings_number: number;
    batting_team_name: string;
    batting_team_short: string;
    total_runs: number;
    total_wickets: number;
    overs_display: string;
    is_complete: boolean;
    target: number|null;
  }>;
  current_innings: {
    id: string;
    innings_number: number;
    batting_team_name: string;
    batting_team_short: string;
    batting_team_color: string;
    bowling_team_name: string;
    total_runs: number;
    total_wickets: number;
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
    player_id: string; name: string; runs: number; balls: number; fours: number; sixes: number;
    sr: number; is_not_out: boolean; is_striker: boolean; is_non_striker: boolean;
    dismissal: string|null; batting_position: number;
  }>;
  bowling: Array<{
    player_id: string; name: string; overs_display: string; maidens: number;
    runs_conceded: number; wickets: number; economy: number; wides: number; no_balls: number; is_current: boolean;
  }>;
  current_striker: { player_id: string; name: string; runs: number; balls: number; fours: number; sixes: number; sr: number; } | null;
  current_non_striker: { player_id: string; name: string; runs: number; balls: number; fours: number; sixes: number; sr: number; } | null;
  current_bowler: { player_id: string; name: string; overs_display: string; runs_conceded: number; wickets: number; maidens: number; economy: number; } | null;
  recent_balls: Array<{ overNumber: number; ballInOver: number; display: string; isWicket: boolean; extraType: string; isLegal: boolean; isFreeHit: boolean; total: number; }>;
  over_history: Array<{ over_number: number; balls: Array<{ display: string; is_wicket: boolean; extra_type: string; is_legal: boolean; }>; runs_in_over: number; wickets_in_over: number; }>;
  fall_of_wickets: Array<{ wicket_number: number; score_at_fall: number; over_at_fall: string; player_name: string; }>;
  partnership: { runs: number; balls: number; };
  win_probability: { batting: number; bowling: number; } | null; // always sums to 100
  is_free_hit: boolean;
  result_text: string|null;
}

export interface MatchSummary {
  id: string;
  name: string;
  status: string;
  tournament_name: string;
  team_a: { name: string; short_name: string; primary_color: string; };
  team_b: { name: string; short_name: string; primary_color: string; };
  toss_summary: string | null;
  result_text: string | null;
  innings: Array<{
    innings_number: number;
    batting_team_short: string;
    total_runs: number;
    total_wickets: number;
    overs_display: string;
    target: number | null;
  }>;
}

export interface SquadPlayer {
  id: string;
  name: string;
  role: string;
  is_captain: boolean;
  is_wicket_keeper: boolean;
}

export interface MatchDetails {
  id: string;
  name: string;
  status: string;
  venue: string;
  tournament_name: string;
  team_a: { id: string; name: string; short_name: string; };
  team_b: { id: string; name: string; short_name: string; };
  team_a_squad: SquadPlayer[];
  team_b_squad: SquadPlayer[];
}
