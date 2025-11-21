
import { PlayerRole, Team, Player, Match, MatchStatus, Tournament } from './types';

export const COLORS = {
  primary: '#10b981', // Emerald 500
  secondary: '#3b82f6', // Blue 500
  accent: '#f59e0b', // Amber 500
  danger: '#ef4444', // Red 500
  dark: '#1e293b', // Slate 800
};

const generateId = () => Math.random().toString(36).substring(2, 9);

const createPlayer = (name: string, role: PlayerRole, idOverride?: string, avgOverride?: number): Player => ({
  id: idOverride || generateId(),
  name,
  role,
  battingAvg: avgOverride || (Math.floor(Math.random() * 40) + 10),
  bowlingAvg: Math.floor(Math.random() * 30) + 20,
});

// Hardcoded IDs for simulation
const ROHIT_ID = 'player_rohit_sharma';
const BUMRAH_ID = 'player_jasprit_bumrah';
const SMITH_ID = 'player_steve_smith';
const ABBOTT_ID = 'player_sean_abbott';

export const INITIAL_TEAMS: Team[] = [
  {
    id: 'team_ind',
    name: 'Mumbai Masters',
    shortName: 'MUM',
    color: 'bg-blue-600',
    players: [
      createPlayer('R. Sharma', PlayerRole.BATSMAN, ROHIT_ID, 49.2),
      createPlayer('I. Kishan', PlayerRole.WICKET_KEEPER),
      createPlayer('S. Yadav', PlayerRole.BATSMAN),
      createPlayer('H. Pandya', PlayerRole.ALL_ROUNDER),
      createPlayer('J. Bumrah', PlayerRole.BOWLER, BUMRAH_ID),
      createPlayer('T. David', PlayerRole.BATSMAN),
      createPlayer('A. Madhwal', PlayerRole.BOWLER),
      createPlayer('P. Chawla', PlayerRole.BOWLER),
      createPlayer('T. Varma', PlayerRole.BATSMAN),
      createPlayer('G. Coetzee', PlayerRole.BOWLER),
      createPlayer('N. Wadhera', PlayerRole.BATSMAN),
    ]
  },
  {
    id: 'team_aus',
    name: 'Sydney Sixers',
    shortName: 'SYD',
    color: 'bg-pink-600',
    players: [
      createPlayer('S. Smith', PlayerRole.BATSMAN, SMITH_ID),
      createPlayer('J. Philippe', PlayerRole.WICKET_KEEPER),
      createPlayer('M. Henriques', PlayerRole.ALL_ROUNDER),
      createPlayer('S. Abbott', PlayerRole.BOWLER, ABBOTT_ID),
      createPlayer('B. Dwarshuis', PlayerRole.BOWLER),
      createPlayer('J. Silk', PlayerRole.BATSMAN),
      createPlayer('T. Murphy', PlayerRole.BOWLER),
      createPlayer('I. Naveed', PlayerRole.BOWLER),
      createPlayer('K. Patterson', PlayerRole.BATSMAN),
      createPlayer('H. Kerr', PlayerRole.ALL_ROUNDER),
      createPlayer('J. Edwards', PlayerRole.BATSMAN),
    ]
  },
  {
    id: 'team_eng',
    name: 'London Spirit',
    shortName: 'LON',
    color: 'bg-indigo-600',
    players: [
      createPlayer('Z. Crawley', PlayerRole.BATSMAN),
      createPlayer('D. Lawrence', PlayerRole.BATSMAN),
      createPlayer('L. Dawson', PlayerRole.ALL_ROUNDER),
      createPlayer('O. Stone', PlayerRole.BOWLER),
      createPlayer('M. Wood', PlayerRole.BOWLER),
      createPlayer('R. Bopara', PlayerRole.ALL_ROUNDER),
      createPlayer('A. Rossington', PlayerRole.WICKET_KEEPER),
      createPlayer('D. Worrall', PlayerRole.BOWLER),
      createPlayer('M. Critchley', PlayerRole.ALL_ROUNDER),
      createPlayer('L. Du Plooy', PlayerRole.BATSMAN),
      createPlayer('R. Gleeson', PlayerRole.BOWLER),
    ]
  }
];

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'match_1',
    tournamentId: 'tour_1',
    homeTeamId: 'team_ind',
    awayTeamId: 'team_aus',
    date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    status: MatchStatus.SCHEDULED,
    format: 'T20',
    maxOvers: 20,
    currentInningsIndex: 0,
    innings: [],
    venue: 'Wankhede Stadium'
  },
  // Add a historical match to show stats for Rohit
  {
      id: 'match_history_1',
      tournamentId: 'tour_1',
      homeTeamId: 'team_ind',
      awayTeamId: 'team_aus',
      date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      status: MatchStatus.COMPLETED,
      format: 'T20',
      maxOvers: 5, // Short match for data simplicity
      currentInningsIndex: 1,
      winnerTeamId: 'team_ind',
      venue: 'Eden Gardens',
      tossWinnerId: 'team_ind',
      tossDecision: 'BAT',
      innings: [
          {
              battingTeamId: 'team_ind',
              bowlingTeamId: 'team_aus',
              totalRuns: 52,
              wickets: 0,
              oversBowled: 5,
              isClosed: true,
              balls: [
                  // Simulating a quick fire start for Rohit (ROHIT_ID) against Abbott (ABBOTT_ID)
                  { ballNumber: 1, overNumber: 0, bowlerId: ABBOTT_ID, strikerId: ROHIT_ID, nonStrikerId: 'p_ishan', runs: 4, isWicket: false, isExtra: false, commentary: "Four runs! Beautiful cover drive." },
                  { ballNumber: 2, overNumber: 0, bowlerId: ABBOTT_ID, strikerId: ROHIT_ID, nonStrikerId: 'p_ishan', runs: 0, isWicket: false, isExtra: false, commentary: "No run." },
                  { ballNumber: 3, overNumber: 0, bowlerId: ABBOTT_ID, strikerId: ROHIT_ID, nonStrikerId: 'p_ishan', runs: 6, isWicket: false, isExtra: false, commentary: "SIX! Massive hit over mid-wicket." },
                  { ballNumber: 4, overNumber: 0, bowlerId: ABBOTT_ID, strikerId: ROHIT_ID, nonStrikerId: 'p_ishan', runs: 1, isWicket: false, isExtra: false, commentary: "Single taken." },
                  { ballNumber: 5, overNumber: 0, bowlerId: ABBOTT_ID, strikerId: 'p_ishan', nonStrikerId: ROHIT_ID, runs: 1, isWicket: false, isExtra: false, commentary: "Single to rotate strike." },
                  { ballNumber: 6, overNumber: 0, bowlerId: ABBOTT_ID, strikerId: ROHIT_ID, nonStrikerId: 'p_ishan', runs: 4, isWicket: false, isExtra: false, commentary: "Four more to end the over." },
                  // Just some dummy data to pad stats
                  { ballNumber: 1, overNumber: 1, bowlerId: 'p_dwarshuis', strikerId: ROHIT_ID, nonStrikerId: 'p_ishan', runs: 6, isWicket: false, isExtra: false, commentary: "Another six! He is on fire." },
              ]
          },
          {
              battingTeamId: 'team_aus',
              bowlingTeamId: 'team_ind',
              totalRuns: 45,
              wickets: 4,
              oversBowled: 5,
              isClosed: true,
              balls: [] // Empty just for structure
          }
      ]
  }
];

export const INITIAL_TOURNAMENTS: Tournament[] = [
    {
        id: 'tour_1',
        name: 'Champions League 2025',
        status: 'ONGOING',
        teamIds: ['team_ind', 'team_aus', 'team_eng'],
        matchIds: ['match_1', 'match_history_1']
    }
];
