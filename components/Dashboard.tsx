
import React, { useState } from 'react';
import { Match, Team, MatchStatus, Tournament, ViewState } from '../types';
import { Play, Calendar, Trophy, FileBarChart, Clock, MapPin, X, Award, User, Star, Users } from 'lucide-react';

interface DashboardProps {
  matches: Match[];
  teams: Team[];
  tournaments: Tournament[];
  onStartMatch: (matchId: string) => void;
  onCreateMatch: (match: Match) => void;
  onViewChange: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ matches, teams, tournaments, onStartMatch, onCreateMatch, onViewChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [venue, setVenue] = useState('');
  const [date, setDate] = useState('');
  const [overs, setOvers] = useState(20);
  const [selectedTournamentId, setSelectedTournamentId] = useState('');

  const getTeam = (id: string) => teams.find(t => t.id === id);

  const handleCreateSubmit = () => {
      if (!homeTeamId || !awayTeamId || !date) return;
      
      const newMatch: Match = {
        id: `match_${Date.now()}`,
        tournamentId: selectedTournamentId || undefined,
        homeTeamId,
        awayTeamId,
        date: date,
        status: MatchStatus.SCHEDULED,
        format: overs === 20 ? 'T20' : overs === 50 ? 'ODI' : 'Custom',
        maxOvers: overs,
        currentInningsIndex: 0,
        innings: [],
        venue: venue || 'Unknown Venue'
      };
      
      onCreateMatch(newMatch);
      setIsModalOpen(false);
      // Reset
      setHomeTeamId('');
      setAwayTeamId('');
      setVenue('');
      setDate('');
      setSelectedTournamentId('');
      setOvers(20);
  };

  const calculateAwards = (match: Match) => {
      if (match.status !== MatchStatus.COMPLETED || match.innings.length === 0) return null;
      
      let bestBat = { id: '', name: '', runs: -1 };
      let bestBowl = { id: '', name: '', wickets: -1, economy: 999 };
      let mvp = { id: '', name: '', points: -1 };
      
      const playerPoints: Record<string, number> = {};

      // Process all innings
      match.innings.forEach(inn => {
          // Batting
          const batStats: Record<string, number> = {};
          const bowlStats: Record<string, { w: number, r: number, b: number }> = {};
          
          inn.balls.forEach(b => {
              // Batting Runs
              if (!['WD', 'NB', 'LB', 'B'].includes(b.extraType || '')) {
                  batStats[b.strikerId] = (batStats[b.strikerId] || 0) + b.runs;
              } else if (b.extraType === 'NB') {
                  // Runs off bat in NB count
                  batStats[b.strikerId] = (batStats[b.strikerId] || 0) + b.runs;
              }

              // Bowling Stats
              if (b.bowlerId) {
                  if (!bowlStats[b.bowlerId]) bowlStats[b.bowlerId] = { w: 0, r: 0, b: 0 };
                  const bs = bowlStats[b.bowlerId];
                  
                  if (!['WD', 'NB'].includes(b.extraType || '')) bs.b++;
                  
                  let runs = b.runs;
                  if (['WD', 'NB'].includes(b.extraType || '')) runs += 1;
                  if (['LB', 'B'].includes(b.extraType || '')) runs = 0;
                  bs.r += runs;

                  if (b.isWicket && b.wicketType !== 'RUN_OUT') {
                      bs.w++;
                  }
              }

              // Fielding Points (Catch/Stump)
              if (b.isWicket && b.fielderId) {
                  playerPoints[b.fielderId] = (playerPoints[b.fielderId] || 0) + 10;
              }
          });

          // Aggregate Batting
          Object.entries(batStats).forEach(([pid, runs]) => {
             const pName = teams.flatMap(t => t.players).find(p => p.id === pid)?.name || '';
             if (runs > bestBat.runs) bestBat = { id: pid, name: pName, runs };
             playerPoints[pid] = (playerPoints[pid] || 0) + runs;
          });

          // Aggregate Bowling
          Object.entries(bowlStats).forEach(([pid, s]) => {
              const pName = teams.flatMap(t => t.players).find(p => p.id === pid)?.name || '';
              const eco = s.b > 0 ? s.r / (s.b/6) : 0;
              
              if (s.w > bestBowl.wickets) {
                  bestBowl = { id: pid, name: pName, wickets: s.w, economy: eco };
              } else if (s.w === bestBowl.wickets && eco < bestBowl.economy) {
                  bestBowl = { id: pid, name: pName, wickets: s.w, economy: eco };
              }

              playerPoints[pid] = (playerPoints[pid] || 0) + (s.w * 25);
          });
      });

      // Determine MVP (Must be from winning team)
      if (match.winnerTeamId) {
          const winningTeamPlayers = teams.find(t => t.id === match.winnerTeamId)?.players.map(p => p.id) || [];
          Object.entries(playerPoints).forEach(([pid, pts]) => {
              if (winningTeamPlayers.includes(pid)) {
                  if (pts > mvp.points) {
                      const pName = teams.flatMap(t => t.players).find(p => p.id === pid)?.name || '';
                      mvp = { id: pid, name: pName, points: pts };
                  }
              }
          });
      }

      return { bestBat, bestBowl, mvp };
  };

  const scrollToMatches = () => {
      const element = document.getElementById('matches-section');
      if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome to CricGenie Manager</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-emerald-200 transition-all transform hover:-translate-y-0.5 flex items-center gap-2 font-medium"
        >
            <Play className="w-4 h-4" /> New Match
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Teams Tile - Click to go to Teams */}
          <div 
            onClick={() => onViewChange('TEAMS')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-105 hover:shadow-xl"
          >
              <div className="flex items-center gap-4 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg"><Users className="w-6 h-6" /></div>
                  <span className="text-blue-100 font-medium">Teams</span>
              </div>
              <div className="text-4xl font-bold">{teams.length}</div>
              <div className="mt-2 text-xs text-blue-100 opacity-75 flex items-center gap-1">
                  Manage Players & Squads <Play className="w-3 h-3" />
              </div>
          </div>

          {/* Live Matches Tile - Click to Scroll to Matches */}
          <div 
            onClick={scrollToMatches}
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-105 hover:shadow-xl"
          >
              <div className="flex items-center gap-4 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg"><Play className="w-6 h-6" /></div>
                  <span className="text-emerald-100 font-medium">Live Matches</span>
              </div>
              <div className="text-4xl font-bold">{matches.filter(m => m.status === MatchStatus.LIVE).length}</div>
              <div className="mt-2 text-xs text-emerald-100 opacity-75 flex items-center gap-1">
                  Resume Scoring <Play className="w-3 h-3" />
              </div>
          </div>

          {/* Scheduled Tile - Click to go to Tournaments */}
          <div 
            onClick={() => onViewChange('TOURNAMENTS')}
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer transform transition-transform hover:scale-105 hover:shadow-xl"
          >
              <div className="flex items-center gap-4 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg"><Calendar className="w-6 h-6" /></div>
                  <span className="text-indigo-100 font-medium">Scheduled</span>
              </div>
              <div className="text-4xl font-bold">{matches.filter(m => m.status === MatchStatus.SCHEDULED).length}</div>
              <div className="mt-2 text-xs text-indigo-100 opacity-75 flex items-center gap-1">
                  View Calendar <Play className="w-3 h-3" />
              </div>
          </div>
      </div>

      <h2 id="matches-section" className="text-xl font-bold text-slate-800 mb-4">Matches</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {matches.map(match => {
            const home = getTeam(match.homeTeamId);
            const away = getTeam(match.awayTeamId);
            const tournament = tournaments.find(t => t.id === match.tournamentId);

            if (!home || !away) return null;
            
            const awards = calculateAwards(match);

            return (
                <div key={match.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                    <div className="p-5 flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex flex-col gap-1">
                                <span className={`self-start px-2.5 py-1 rounded-full text-xs font-bold ${
                                    match.status === MatchStatus.LIVE ? 'bg-red-100 text-red-600' : 
                                    match.status === MatchStatus.COMPLETED ? 'bg-slate-100 text-slate-600' : 
                                    'bg-blue-50 text-blue-600'
                                }`}>
                                    {match.status === MatchStatus.LIVE ? 'LIVE' : match.status}
                                </span>
                                {tournament && (
                                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                        <Trophy className="w-3 h-3" /> {tournament.name}
                                    </span>
                                )}
                            </div>
                             <div className="flex flex-col items-end">
                                <span className="text-xs text-slate-400 font-medium">{new Date(match.date).toLocaleDateString()}</span>
                                <span className="text-[10px] text-slate-400">{new Date(match.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full ${home.color} flex items-center justify-center text-white text-xs font-bold`}>{home.shortName}</div>
                                    <span className="font-semibold text-slate-700">{home.name}</span>
                                </div>
                                {match.innings.length > 0 && match.innings[0].battingTeamId === home.id ? (
                                    <span className="font-mono font-bold text-slate-900">{match.innings[0].totalRuns}/{match.innings[0].wickets}</span>
                                ) : match.innings.length > 1 && match.innings[1].battingTeamId === home.id ? (
                                    <span className="font-mono font-bold text-slate-900">{match.innings[1].totalRuns}/{match.innings[1].wickets}</span>
                                ) : <span className="text-slate-300 text-sm">--</span>}
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full ${away.color} flex items-center justify-center text-white text-xs font-bold`}>{away.shortName}</div>
                                    <span className="font-semibold text-slate-700">{away.name}</span>
                                </div>
                                {match.innings.length > 0 && match.innings[0].battingTeamId === away.id ? (
                                    <span className="font-mono font-bold text-slate-900">{match.innings[0].totalRuns}/{match.innings[0].wickets}</span>
                                ) : match.innings.length > 1 && match.innings[1].battingTeamId === away.id ? (
                                    <span className="font-mono font-bold text-slate-900">{match.innings[1].totalRuns}/{match.innings[1].wickets}</span>
                                ) : <span className="text-slate-300 text-sm">--</span>}
                            </div>
                        </div>
                        
                        {/* Awards Section */}
                        {awards && (
                            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-2 border border-slate-100">
                                <div className="flex items-center justify-between text-orange-600">
                                    <div className="flex items-center gap-1"><Star className="w-3 h-3 fill-current" /> <span className="font-bold">MVP</span></div>
                                    <span>{awards.mvp.name}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <div className="flex items-center gap-1"><User className="w-3 h-3" /> Best Bat</div>
                                    <span>{awards.bestBat.name} ({awards.bestBat.runs})</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                    <div className="flex items-center gap-1"><Award className="w-3 h-3" /> Best Bowl</div>
                                    <span>{awards.bestBowl.name} ({awards.bestBowl.wickets}w)</span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end">
                        {match.status !== MatchStatus.COMPLETED ? (
                            <button 
                                onClick={() => onStartMatch(match.id)}
                                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 px-4 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                            >
                                {match.status === MatchStatus.LIVE ? 'Resume Scoring' : 'Start Match'}
                            </button>
                        ) : (
                            <button 
                                onClick={() => onStartMatch(match.id)}
                                className="text-sm font-medium text-slate-600 hover:text-slate-800 px-4 py-1.5 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2"
                            >
                                <FileBarChart className="w-4 h-4" /> View Stats
                            </button>
                        )}
                    </div>
                </div>
            );
        })}
      </div>

      {/* Create Match Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">Schedule New Match</h2>
                    <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Tournament (Optional)</label>
                        <select 
                            value={selectedTournamentId} onChange={e => setSelectedTournamentId(e.target.value)}
                            className="w-full p-3 border rounded-lg text-slate-900 bg-white"
                        >
                            <option value="">Friendly / No Tournament</option>
                            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Home Team</label>
                        <select 
                            value={homeTeamId} onChange={e => setHomeTeamId(e.target.value)}
                            className="w-full p-3 border rounded-lg text-slate-900 bg-white"
                        >
                            <option value="">Select Home Team</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Away Team</label>
                        <select 
                            value={awayTeamId} onChange={e => setAwayTeamId(e.target.value)}
                            className="w-full p-3 border rounded-lg text-slate-900 bg-white"
                        >
                            <option value="">Select Away Team</option>
                            {teams.filter(t => t.id !== homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Date & Time</label>
                        <input 
                            type="datetime-local"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full p-3 border rounded-lg text-slate-900 bg-white"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Venue</label>
                            <input 
                                type="text"
                                placeholder="Stadium"
                                value={venue}
                                onChange={e => setVenue(e.target.value)}
                                className="w-full p-3 border rounded-lg text-slate-900 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Max Overs</label>
                            <input 
                                type="number"
                                value={overs}
                                onChange={e => setOvers(parseInt(e.target.value))}
                                className="w-full p-3 border rounded-lg text-slate-900 bg-white"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleCreateSubmit}
                        disabled={!homeTeamId || !awayTeamId || !date}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold mt-4 disabled:opacity-50 shadow-lg shadow-emerald-200"
                    >
                        Schedule Match
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
