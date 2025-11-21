
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TeamManager from './components/TeamManager';
import MatchScorer from './components/MatchScorer';
import PlayerProfile from './components/PlayerProfile';
import { TournamentManager } from './components/TournamentManager';
import { ViewState, Team, Match, MatchStatus, Tournament, PersistenceMode } from './types';
import { Trophy, Calendar, FileBarChart, Loader2 } from 'lucide-react';
import { persistence } from './services/persistence';

const App: React.FC = () => {
  // --- State ---
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null); // For Profile
  const [previousView, setPreviousView] = useState<ViewState>('DASHBOARD');
  const [storageMode, setStorageMode] = useState<PersistenceMode>('LOCAL');

  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  const isLoaded = useRef(false);

  // --- Load Data ---
  const loadData = async () => {
    setIsLoading(true);
    isLoaded.current = false;
    
    const data = await persistence.loadAll();
    setTeams(data.teams);
    setMatches(data.matches);
    setTournaments(data.tournaments);
    
    setIsLoading(false);
    isLoaded.current = true;
  };

  // --- Initialization ---
  useEffect(() => {
    // Get saved mode or default to LOCAL
    const savedMode = persistence.getMode();
    setStorageMode(savedMode);
    loadData();
  }, []);

  // --- Persist Changes ---
  useEffect(() => { if (isLoaded.current) persistence.saveTeams(teams); }, [teams]);
  useEffect(() => { if (isLoaded.current) persistence.saveMatches(matches); }, [matches]);
  useEffect(() => { if (isLoaded.current) persistence.saveTournaments(tournaments); }, [tournaments]);

  // --- Handlers ---
  const handleToggleStorageMode = () => {
      const newMode = storageMode === 'LOCAL' ? 'BACKEND' : 'LOCAL';
      setStorageMode(newMode);
      persistence.setMode(newMode);
      loadData(); // Reload data from new source
  };

  const handleStartMatch = (matchId: string) => {
    setMatches(prev => prev.map(m => m.id === matchId && m.status === MatchStatus.SCHEDULED ? { ...m, status: MatchStatus.LIVE } : m));
    setActiveMatchId(matchId);
    setPreviousView(currentView); 
    setCurrentView('MATCH_SCORER');
  };

  const handleUpdateMatch = (updatedMatch: Match) => {
    setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
  };

  const handleCreateMatch = (newMatch: Match) => {
    setMatches([newMatch, ...matches]);
    if (newMatch.tournamentId) {
        setTournaments(prev => prev.map(t => 
            t.id === newMatch.tournamentId ? { ...t, matchIds: [...t.matchIds, newMatch.id] } : t
        ));
    }
  };

  const handleExitScorer = () => {
      setCurrentView(previousView);
      setActiveMatchId(null);
  };
  
  const handleViewPlayerProfile = (playerId: string) => {
      setActivePlayerId(playerId);
      setPreviousView(currentView);
      setCurrentView('PLAYER_PROFILE');
  };

  const activeMatch = matches.find(m => m.id === activeMatchId);

  if (isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-emerald-600">
              <Loader2 className="w-12 h-12 animate-spin mb-4" />
              <p className="font-medium text-slate-600">Loading {storageMode === 'BACKEND' ? 'Database' : 'Local Data'}...</p>
          </div>
      );
  }

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            matches={matches} 
            teams={teams} 
            tournaments={tournaments}
            onStartMatch={handleStartMatch}
            onCreateMatch={handleCreateMatch}
            onViewChange={setCurrentView}
          />
        );
      case 'TOURNAMENTS':
          return (
            <TournamentManager 
                tournaments={tournaments}
                teams={teams}
                setTournaments={setTournaments}
                matches={matches}
                setMatches={setMatches}
                onStartMatch={handleStartMatch}
            />
          );
      case 'TEAMS':
        return (
            <TeamManager 
                teams={teams} 
                setTeams={setTeams} 
                onBack={() => setCurrentView('DASHBOARD')}
                onViewPlayerProfile={handleViewPlayerProfile}
            />
        );
      case 'PLAYER_PROFILE':
        return activePlayerId ? (
            <PlayerProfile 
                playerId={activePlayerId}
                teams={teams}
                matches={matches}
                onBack={() => setCurrentView('TEAMS')}
            />
        ) : <div>Select a player</div>;
      case 'MATCH_SCORER':
        return activeMatch ? (
          <MatchScorer 
            match={activeMatch} 
            teams={teams} 
            onUpdateMatch={handleUpdateMatch}
            onExit={handleExitScorer}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">Select a match from Dashboard</div>
        );
      case 'HISTORY':
        const completedMatches = matches.filter(m => m.status === MatchStatus.COMPLETED);
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Match History</h2>
                        <p className="text-slate-500">Archive of completed matches, scorecards, and commentary.</p>
                    </div>
                    <button onClick={() => setCurrentView('DASHBOARD')} className="ml-auto text-slate-500 hover:text-slate-800 text-sm font-medium">Back to Dashboard</button>
                </div>
                
                {completedMatches.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">No completed matches found.</p>
                        <p className="text-slate-400 text-sm">Finish a game to see it here.</p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {completedMatches.map(m => {
                             const home = teams.find(t => t.id === m.homeTeamId);
                             const away = teams.find(t => t.id === m.awayTeamId);
                             const winner = teams.find(t => t.id === m.winnerTeamId);
                             
                             if (!home || !away) return null;

                             const inn1 = m.innings[0];
                             const inn2 = m.innings[1];
                             const homeInn = m.innings.find(i => i.battingTeamId === home.id);
                             const awayInn = m.innings.find(i => i.battingTeamId === away.id);

                             let resultText = "Match Drawn";
                             if (m.winnerTeamId) {
                                 if (inn1 && inn2) {
                                     if (m.winnerTeamId === inn1.battingTeamId) {
                                         resultText = `${winner?.name} won by ${inn1.totalRuns - inn2.totalRuns} runs`;
                                     } else {
                                         resultText = `${winner?.name} won by ${10 - inn2.wickets} wickets`;
                                     }
                                 } else {
                                     resultText = `${winner?.name} Won`;
                                 }
                             }

                             return (
                                 <div key={m.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group">
                                     <div className="p-6">
                                         <div className="flex justify-between items-start mb-6">
                                             <div>
                                                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{new Date(m.date).toLocaleDateString()} • {m.venue}</div>
                                                 <div className="text-lg font-bold text-emerald-600">{resultText}</div>
                                             </div>
                                             <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">{m.format}</span>
                                         </div>

                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-6">
                                             <div className={`flex flex-col items-center p-4 rounded-lg ${m.winnerTeamId === home.id ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'}`}>
                                                 <div className={`w-12 h-12 rounded-full ${home.color} text-white flex items-center justify-center font-bold text-lg mb-2`}>{home.shortName}</div>
                                                 <span className="font-bold text-slate-800 text-center">{home.name}</span>
                                                 <div className="mt-2 text-xl font-mono font-bold text-slate-900">
                                                     {homeInn ? `${homeInn.totalRuns}/${homeInn.wickets}` : '-'}
                                                 </div>
                                                 <div className="text-xs text-slate-500">{homeInn?.oversBowled} ov</div>
                                             </div>

                                             <div className="text-center text-slate-300 font-bold text-xl">VS</div>

                                              <div className={`flex flex-col items-center p-4 rounded-lg ${m.winnerTeamId === away.id ? 'bg-emerald-50/50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'}`}>
                                                 <div className={`w-12 h-12 rounded-full ${away.color} text-white flex items-center justify-center font-bold text-lg mb-2`}>{away.shortName}</div>
                                                 <span className="font-bold text-slate-800 text-center">{away.name}</span>
                                                 <div className="mt-2 text-xl font-mono font-bold text-slate-900">
                                                     {awayInn ? `${awayInn.totalRuns}/${awayInn.wickets}` : '-'}
                                                 </div>
                                                 <div className="text-xs text-slate-500">{awayInn?.oversBowled} ov</div>
                                             </div>
                                         </div>

                                         <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                                             <div className="flex items-center gap-2 text-sm text-slate-500">
                                                 <Trophy className="w-4 h-4 text-yellow-500" />
                                                 Man of the Match: <span className="font-bold text-slate-700">Calculated in Scorecard</span>
                                             </div>
                                             <button 
                                                 onClick={() => handleStartMatch(m.id)}
                                                 className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors"
                                             >
                                                 <FileBarChart className="w-4 h-4" /> View Full Scorecard
                                             </button>
                                         </div>
                                     </div>
                                 </div>
                             );
                        })}
                    </div>
                )}
            </div>
        );
      default:
        return (
            <Dashboard 
                matches={matches} 
                teams={teams} 
                tournaments={tournaments}
                onStartMatch={handleStartMatch} 
                onCreateMatch={handleCreateMatch} 
                onViewChange={setCurrentView}
            />
        );
    }
  };

  return (
    <Layout 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        storageMode={storageMode} 
        onToggleStorageMode={handleToggleStorageMode}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
