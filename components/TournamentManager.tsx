
import React, { useState } from 'react';
import { Tournament, Team, Match, MatchStatus } from '../types';
import { Trophy, Plus, Calendar, Users, ArrowRight, Table as TableIcon, BarChart3, ChevronDown } from 'lucide-react';

interface TournamentManagerProps {
  tournaments: Tournament[];
  teams: Team[];
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  onStartMatch: (matchId: string) => void;
}

export const TournamentManager: React.FC<TournamentManagerProps> = ({ 
    tournaments, teams, setTournaments, matches, setMatches, onStartMatch 
}) => {
  const [view, setView] = useState<'LIST' | 'DETAILS'>('LIST');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [detailsTab, setDetailsTab] = useState<'MATCHES' | 'TABLE' | 'STATS'>('MATCHES');
  
  // Form States
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  
  const [newMatchHome, setNewMatchHome] = useState('');
  const [newMatchAway, setNewMatchAway] = useState('');
  const [newMatchVenue, setNewMatchVenue] = useState('');
  const [newMatchOvers, setNewMatchOvers] = useState(20);
  const [newMatchDate, setNewMatchDate] = useState('');

  const handleCreateTournament = () => {
    if (!newTournamentName.trim()) return;
    const newTour: Tournament = {
        id: `tour_${Date.now()}`,
        name: newTournamentName,
        status: 'UPCOMING',
        startDate: newStartDate || undefined,
        endDate: newEndDate || undefined,
        teamIds: [],
        matchIds: []
    };
    setTournaments([...tournaments, newTour]);
    setNewTournamentName('');
    setNewStartDate('');
    setNewEndDate('');
  };

  const selectedTournament = tournaments.find(t => t.id === selectedTournamentId);
  const tournamentMatches = matches.filter(m => m.tournamentId === selectedTournamentId);

  const handleAddTeamToTournament = (teamId: string) => {
      if (!selectedTournament) return;
      if (selectedTournament.teamIds.includes(teamId)) return;
      
      const updated = { ...selectedTournament, teamIds: [...selectedTournament.teamIds, teamId] };
      setTournaments(tournaments.map(t => t.id === selectedTournament.id ? updated : t));
  };

  const handleStatusChange = (newStatus: Tournament['status']) => {
      if (!selectedTournament) return;
      const updated = { ...selectedTournament, status: newStatus };
      setTournaments(tournaments.map(t => t.id === selectedTournament.id ? updated : t));
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
      if (!selectedTournament) return;
      const updated = { ...selectedTournament, [field]: value };
      setTournaments(tournaments.map(t => t.id === selectedTournament.id ? updated : t));
  };

  const handleScheduleMatch = () => {
      if (!selectedTournament || !newMatchHome || !newMatchAway || !newMatchDate) return;
      
      const newMatch: Match = {
          id: `match_${Date.now()}`,
          tournamentId: selectedTournament.id,
          homeTeamId: newMatchHome,
          awayTeamId: newMatchAway,
          date: newMatchDate,
          status: MatchStatus.SCHEDULED,
          format: 'T20',
          maxOvers: newMatchOvers,
          currentInningsIndex: 0,
          innings: [],
          venue: newMatchVenue || 'Unknown Venue'
      };

      setMatches([...matches, newMatch]);
      
      const updatedTour = { 
          ...selectedTournament, 
          matchIds: [...selectedTournament.matchIds, newMatch.id] 
      };
      setTournaments(tournaments.map(t => t.id === selectedTournament.id ? updatedTour : t));
      
      setNewMatchHome('');
      setNewMatchAway('');
      setNewMatchVenue('');
      setNewMatchDate('');
  };

  const getPointsTable = () => {
      if (!selectedTournament) return [];
      
      const stats: Record<string, { p: number, w: number, l: number, t: number, pts: number }> = {};
      
      selectedTournament.teamIds.forEach(tid => {
          stats[tid] = { p: 0, w: 0, l: 0, t: 0, pts: 0 };
      });

      tournamentMatches.filter(m => m.status === MatchStatus.COMPLETED).forEach(m => {
          const home = stats[m.homeTeamId];
          const away = stats[m.awayTeamId];
          
          if (home) home.p++;
          if (away) away.p++;

          if (m.winnerTeamId) {
              if (stats[m.winnerTeamId]) {
                  stats[m.winnerTeamId].w++;
                  stats[m.winnerTeamId].pts += 2;
              }
              const loserId = m.winnerTeamId === m.homeTeamId ? m.awayTeamId : m.homeTeamId;
              if (stats[loserId]) stats[loserId].l++;
          } else {
              // Tie or No Result
              if (home) { home.t++; home.pts += 1; }
              if (away) { away.t++; away.pts += 1; }
          }
      });

      return Object.entries(stats)
        .map(([tid, s]) => ({ teamId: tid, ...s }))
        .sort((a, b) => b.pts - a.pts || b.w - a.w); // Sort by points then wins
  };

  const getPlayerStats = () => {
      const batStats: Record<string, number> = {};
      const bowlStats: Record<string, number> = {};

      tournamentMatches.forEach(m => {
          m.innings.forEach(inn => {
              // Batting runs
              inn.balls.forEach(b => {
                  if (b.extraType !== 'WD' && b.extraType !== 'NB' && b.extraType !== 'LB' && b.extraType !== 'B') {
                     batStats[b.strikerId] = (batStats[b.strikerId] || 0) + b.runs;
                  }
              });
              // Bowling wickets
              inn.balls.forEach(b => {
                  if (b.isWicket && b.wicketType !== 'RUN_OUT') {
                      bowlStats[b.bowlerId] = (bowlStats[b.bowlerId] || 0) + 1;
                  }
              });
          });
      });

      // Convert to array with names
      const allPlayers = teams.flatMap(t => t.players);
      const topRunScorers = Object.entries(batStats)
        .map(([pid, runs]) => ({ name: allPlayers.find(p => p.id === pid)?.name || 'Unknown', val: runs }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 5);
      
      const topWicketTakers = Object.entries(bowlStats)
        .map(([pid, wkts]) => ({ name: allPlayers.find(p => p.id === pid)?.name || 'Unknown', val: wkts }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 5);

      return { topRunScorers, topWicketTakers };
  };

  if (view === 'LIST' || !selectedTournament) {
      return (
          <div className="p-6 max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-emerald-600" /> Tournaments
              </h2>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-8">
                  <h3 className="font-semibold text-slate-700 mb-4">Create Tournament</h3>
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                      <div className="flex-1 w-full">
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
                          <input 
                            type="text" 
                            value={newTournamentName}
                            onChange={e => setNewTournamentName(e.target.value)}
                            placeholder="Tournament Name (e.g. IPL 2024)"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                          <input 
                            type="date" 
                            value={newStartDate}
                            onChange={e => setNewStartDate(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                          <input 
                            type="date" 
                            value={newEndDate}
                            onChange={e => setNewEndDate(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 bg-white"
                          />
                      </div>
                      <button 
                        onClick={handleCreateTournament}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition-colors w-full md:w-auto"
                      >
                          Create
                      </button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tournaments.map(tour => (
                      <div 
                        key={tour.id}
                        onClick={() => { setSelectedTournamentId(tour.id); setView('DETAILS'); }}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all group"
                      >
                          <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                                  <Trophy className="w-6 h-6" />
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${
                                  tour.status === 'ONGOING' ? 'bg-emerald-100 text-emerald-700' : 
                                  tour.status === 'COMPLETED' ? 'bg-slate-100 text-slate-600' : 
                                  'bg-yellow-100 text-yellow-700'
                              }`}>
                                  {tour.status}
                              </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{tour.name}</h3>
                          
                          {(tour.startDate || tour.endDate) && (
                              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {tour.startDate ? new Date(tour.startDate).toLocaleDateString() : 'TBD'} - {tour.endDate ? new Date(tour.endDate).toLocaleDateString() : 'TBD'}
                              </div>
                          )}

                          <div className="mt-4 flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-slate-50">
                              <span>{tour.teamIds.length} Teams</span>
                              <span>{tour.matchIds.length} Matches</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  const { topRunScorers, topWicketTakers } = getPlayerStats();

  return (
      <div className="p-6 max-w-6xl mx-auto">
          <button 
            onClick={() => setView('LIST')}
            className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium"
          >
              &larr; Back to Tournaments
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm gap-4">
            <div className="flex-1">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">{selectedTournament.name}</h2>
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-slate-500 text-sm font-mono">ID: {selectedTournament.id}</span>
                    
                    <div className="flex items-center gap-2">
                         <input 
                             type="date" 
                             value={selectedTournament.startDate || ''}
                             onChange={(e) => handleDateChange('startDate', e.target.value)}
                             className="bg-slate-50 border-none text-xs text-slate-600 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500"
                             title="Start Date"
                         />
                         <span className="text-slate-400">-</span>
                         <input 
                             type="date" 
                             value={selectedTournament.endDate || ''}
                             onChange={(e) => handleDateChange('endDate', e.target.value)}
                             className="bg-slate-50 border-none text-xs text-slate-600 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500"
                             title="End Date"
                         />
                    </div>
                </div>
            </div>
            <div className="flex flex-col items-end min-w-[150px]">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
                <div className="relative w-full">
                    <select 
                        value={selectedTournament.status}
                        onChange={(e) => handleStatusChange(e.target.value as Tournament['status'])}
                        className={`w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-sm font-bold border cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 ${
                            selectedTournament.status === 'ONGOING' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-emerald-500' :
                            selectedTournament.status === 'COMPLETED' ? 'bg-slate-50 text-slate-700 border-slate-200 focus:ring-slate-500' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200 focus:ring-yellow-500'
                        }`}
                    >
                        <option value="UPCOMING">UPCOMING</option>
                        <option value="ONGOING">ONGOING</option>
                        <option value="COMPLETED">COMPLETED</option>
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none opacity-50" />
                </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
              <button 
                onClick={() => setDetailsTab('MATCHES')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${detailsTab === 'MATCHES' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                  Matches & Schedule
              </button>
              <button 
                onClick={() => setDetailsTab('TABLE')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${detailsTab === 'TABLE' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                  Points Table
              </button>
              <button 
                onClick={() => setDetailsTab('STATS')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${detailsTab === 'STATS' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                  Stats
              </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Col: Teams (Always Visible) */}
              <div className="space-y-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-500" /> Teams ({selectedTournament.teamIds.length})
                      </h3>
                      
                      <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                          {selectedTournament.teamIds.map(tid => {
                              const team = teams.find(t => t.id === tid);
                              return team ? (
                                  <div key={tid} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                                      <div className={`w-6 h-6 rounded-full ${team.color} text-white text-[10px] flex items-center justify-center`}>{team.shortName}</div>
                                      <span className="text-sm font-medium text-slate-700">{team.name}</span>
                                  </div>
                              ) : null;
                          })}
                          {selectedTournament.teamIds.length === 0 && <p className="text-slate-400 text-sm italic">No teams added.</p>}
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Add Team</label>
                          <select 
                            onChange={(e) => handleAddTeamToTournament(e.target.value)}
                            value=""
                            className="w-full p-2 border rounded-lg text-sm mb-2 text-slate-900 bg-white"
                          >
                              <option value="">Select Team...</option>
                              {teams.filter(t => !selectedTournament.teamIds.includes(t.id)).map(t => (
                                  <option key={t.id} value={t.id} className="text-slate-900">{t.name}</option>
                              ))}
                          </select>
                      </div>
                  </div>
              </div>

              {/* Right Col: Dynamic Content */}
              <div className="lg:col-span-2 space-y-6">
                  
                  {/* TAB: MATCHES */}
                  {detailsTab === 'MATCHES' && (
                      <>
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-500" /> Schedule Match
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <select 
                                    value={newMatchHome}
                                    onChange={e => setNewMatchHome(e.target.value)}
                                    className="p-2 border rounded-lg text-sm text-slate-900 bg-white"
                                >
                                    <option value="">Home Team</option>
                                    {selectedTournament.teamIds.map(tid => {
                                        const t = teams.find(tm => tm.id === tid);
                                        return t ? <option key={t.id} value={t.id}>{t.name}</option> : null;
                                    })}
                                </select>

                                <select 
                                    value={newMatchAway}
                                    onChange={e => setNewMatchAway(e.target.value)}
                                    className="p-2 border rounded-lg text-sm text-slate-900 bg-white"
                                >
                                    <option value="">Away Team</option>
                                    {selectedTournament.teamIds.filter(tid => tid !== newMatchHome).map(tid => {
                                        const t = teams.find(tm => tm.id === tid);
                                        return t ? <option key={t.id} value={t.id}>{t.name}</option> : null;
                                    })}
                                </select>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date & Time</label>
                                    <input 
                                        type="datetime-local"
                                        value={newMatchDate}
                                        onChange={e => setNewMatchDate(e.target.value)}
                                        className="w-full p-2 border rounded-lg text-sm text-slate-900 bg-white"
                                    />
                                </div>

                                <input 
                                    type="text"
                                    value={newMatchVenue}
                                    onChange={e => setNewMatchVenue(e.target.value)}
                                    placeholder="Venue"
                                    className="p-2 border rounded-lg text-sm text-slate-900 bg-white"
                                />
                                <div className="flex items-center gap-2">
                                        <label className="text-sm text-slate-500 whitespace-nowrap">Max Overs:</label>
                                        <input 
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={newMatchOvers}
                                            onChange={e => setNewMatchOvers(parseInt(e.target.value))}
                                            className="p-2 border rounded-lg text-sm w-20 text-slate-900 bg-white"
                                        />
                                </div>
                            </div>
                            <button 
                                onClick={handleScheduleMatch}
                                disabled={!newMatchHome || !newMatchAway || !newMatchDate}
                                className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Schedule Match
                            </button>
                        </div>

                        <div className="space-y-3">
                            <h3 className="font-bold text-slate-700">Match Schedule</h3>
                            {tournamentMatches.length === 0 ? (
                                <p className="text-slate-400 italic">No matches scheduled yet.</p>
                            ) : (
                                tournamentMatches.map(match => {
                                    const home = teams.find(t => t.id === match.homeTeamId);
                                    const away = teams.find(t => t.id === match.awayTeamId);
                                    if (!home || !away) return null;
                                    
                                    // Determine result text
                                    let resultText = "";
                                    if (match.status === MatchStatus.COMPLETED) {
                                        if (match.winnerTeamId) {
                                            const winner = match.winnerTeamId === home.id ? home : away;
                                            // Quick calculation of margin if innings available
                                            const inn1 = match.innings[0];
                                            const inn2 = match.innings[1];
                                            if (inn1 && inn2) {
                                                if (match.winnerTeamId === inn1.battingTeamId) {
                                                    resultText = `${winner.name} won by ${inn1.totalRuns - inn2.totalRuns} runs`;
                                                } else {
                                                    resultText = `${winner.name} won by ${10 - inn2.wickets} wickets`;
                                                }
                                            } else {
                                                resultText = `${winner.name} Won`;
                                            }
                                        } else {
                                            resultText = "Match Drawn/Tied";
                                        }
                                    }

                                    return (
                                        <div key={match.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                                            <div className="flex-1 w-full">
                                                <div className="flex items-center gap-6 justify-between mb-2">
                                                    <div className="text-right flex-1 font-bold text-slate-800">{home.name}</div>
                                                    <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">VS</div>
                                                    <div className="text-left flex-1 font-bold text-slate-800">{away.name}</div>
                                                </div>
                                                <div className="text-center text-xs text-slate-500 mb-2">
                                                    {new Date(match.date).toLocaleString()}
                                                </div>
                                                {match.status === MatchStatus.COMPLETED && (
                                                    <div className="text-center text-xs font-medium text-emerald-600 bg-emerald-50 py-1 rounded">
                                                        {resultText}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <div className="text-xs text-slate-400">{match.venue}</div>
                                                    {match.status !== MatchStatus.COMPLETED && (
                                                        <div className={`text-xs font-bold ${match.status === 'Live' ? 'text-red-500' : 'text-slate-500'}`}>{match.status}</div>
                                                    )}
                                                </div>
                                                {match.status !== 'Completed' ? (
                                                    <button 
                                                        onClick={() => onStartMatch(match.id)}
                                                        className="bg-indigo-50 text-indigo-600 p-2 rounded-full hover:bg-indigo-100"
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => onStartMatch(match.id)}
                                                        className="bg-emerald-50 text-emerald-600 p-2 rounded-full hover:bg-emerald-100"
                                                        title="View Stats"
                                                    >
                                                        <BarChart3 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                      </>
                  )}

                  {/* TAB: TABLE */}
                  {detailsTab === 'TABLE' && (
                      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-bold">
                                  <tr>
                                      <th className="px-6 py-3">Team</th>
                                      <th className="px-4 py-3 text-center">P</th>
                                      <th className="px-4 py-3 text-center">W</th>
                                      <th className="px-4 py-3 text-center">L</th>
                                      <th className="px-4 py-3 text-center">T/NR</th>
                                      <th className="px-6 py-3 text-right">Pts</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {getPointsTable().map((row, idx) => {
                                      const team = teams.find(t => t.id === row.teamId);
                                      return (
                                          <tr key={row.teamId} className="border-b border-slate-50 hover:bg-slate-50/50">
                                              <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                                                  <span className="text-slate-400 w-4">{idx + 1}</span>
                                                  <div className={`w-6 h-6 rounded-full ${team?.color} text-white text-[10px] flex items-center justify-center`}>{team?.shortName}</div>
                                                  {team?.name}
                                              </td>
                                              <td className="px-4 py-4 text-center text-slate-600">{row.p}</td>
                                              <td className="px-4 py-4 text-center text-emerald-600 font-medium">{row.w}</td>
                                              <td className="px-4 py-4 text-center text-red-500">{row.l}</td>
                                              <td className="px-4 py-4 text-center text-slate-500">{row.t}</td>
                                              <td className="px-6 py-4 text-right font-bold text-slate-800">{row.pts}</td>
                                          </tr>
                                      );
                                  })}
                                  {selectedTournament.teamIds.length === 0 && (
                                      <tr><td colSpan={6} className="p-6 text-center text-slate-400 italic">No teams in tournament</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  )}

                  {/* TAB: STATS */}
                  {detailsTab === 'STATS' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Most Runs */}
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                   <div className="bg-orange-100 p-1.5 rounded text-orange-600"><Trophy className="w-4 h-4" /></div>
                                   Orange Cap (Runs)
                               </h3>
                               <div className="space-y-3">
                                   {topRunScorers.map((p, i) => (
                                       <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0">
                                           <div className="flex items-center gap-3">
                                               <span className="text-xs font-bold text-slate-400 w-4">{i+1}</span>
                                               <span className="text-slate-700 font-medium">{p.name}</span>
                                           </div>
                                           <span className="font-bold text-slate-800">{p.val}</span>
                                       </div>
                                   ))}
                                   {topRunScorers.length === 0 && <p className="text-slate-400 text-sm italic">No stats available</p>}
                               </div>
                          </div>

                          {/* Most Wickets */}
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                               <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                   <div className="bg-purple-100 p-1.5 rounded text-purple-600"><Trophy className="w-4 h-4" /></div>
                                   Purple Cap (Wickets)
                               </h3>
                               <div className="space-y-3">
                                   {topWicketTakers.map((p, i) => (
                                       <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2 last:border-0">
                                           <div className="flex items-center gap-3">
                                               <span className="text-xs font-bold text-slate-400 w-4">{i+1}</span>
                                               <span className="text-slate-700 font-medium">{p.name}</span>
                                           </div>
                                           <span className="font-bold text-slate-800">{p.val}</span>
                                       </div>
                                   ))}
                                   {topWicketTakers.length === 0 && <p className="text-slate-400 text-sm italic">No stats available</p>}
                               </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  };
