
export enum PlayerRole {
  BATSMAN = 'Batsman',
  BOWLER = 'Bowler',
  ALL_ROUNDER = 'All-Rounder',
  WICKET_KEEPER = 'Wicket Keeper'
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  battingAvg?: number;
  bowlingAvg?: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
  players: Player[];
}

export enum MatchStatus {
  SCHEDULED = 'Scheduled',
  LIVE = 'Live',
  COMPLETED = 'Completed'
}

export type WicketType = 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'OTHER';

export interface BallEvent {
  ballNumber: number; // 1 to 6 (or more for extras)
  overNumber: number;
  bowlerId: string;
  strikerId: string;
  nonStrikerId: string;
  runs: number;
  isWicket: boolean;
  wicketType?: WicketType;
  fielderId?: string; // For caught, run out, stumped
  dismissedPlayerId?: string; // Usually striker, but could be non-striker for run out
  isExtra: boolean;
  extraType?: 'WD' | 'NB' | 'LB' | 'B';
  commentary?: string;
}

export interface Innings {
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  wickets: number;
  oversBowled: number; // e.g. 10.2
  balls: BallEvent[];
  isClosed: boolean;
}

export interface Match {
  id: string;
  tournamentId?: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  status: MatchStatus;
  format: 'T20' | 'ODI' | 'Test' | 'Custom';
  maxOvers: number; // New: Maximum overs per innings
  tossWinnerId?: string; // New
  tossDecision?: 'BAT' | 'BOWL'; // New
  currentInningsIndex: number; // 0 or 1 (usually)
  innings: Innings[];
  winnerTeamId?: string;
  venue: string;
  manOfTheMatchId?: string; // New
}

export interface Tournament {
  id: string;
  name: string;
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  teamIds: string[];
  matchIds: string[];
}

export type ViewState = 'DASHBOARD' | 'TEAMS' | 'MATCH_SCORER' | 'HISTORY' | 'TOURNAMENTS' | 'PLAYER_PROFILE';

export type PersistenceMode = 'LOCAL' | 'BACKEND';
