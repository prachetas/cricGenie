
import React from 'react';
import { Player, Match, Team, BallEvent } from '../types';
import { ArrowLeft, Award, Activity, TrendingUp, History, Calendar, MapPin } from 'lucide-react';

interface PlayerProfileProps {
    playerId: string;
    teams: Team[];
    matches: Match[];
    onBack: () => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ playerId, teams, matches, onBack }) => {
    const playerTeam = teams.find(t => t.players.some(p => p.id === playerId));
    const player = playerTeam?.players.find(p => p.id === playerId);

    if (!player || !playerTeam) return <div>Player not found</div>;

    // --- Calculation Logic ---
    const playerMatches = matches.filter(m => 
        m.innings.some(inn => inn.balls.some(b => b.strikerId === playerId || b.bowlerId === playerId))
    );

    // Career Batting Stats
    let totalRuns = 0;
    let ballsFaced = 0;
    let inningsBatted = 0;
    let notOuts = 0;
    let fours = 0;
    let sixes = 0;
    let highestScore = 0;
    let centuries = 0;
    let fifties = 0;

    // Career Bowling Stats
    let ballsBowled = 0;
    let runsConceded = 0;
    let totalWickets = 0;
    let inningsBowled = 0;

    playerMatches.forEach(m => {
        m.innings.forEach(inn => {
            // Batting
            const playerBalls = inn.balls.filter(b => b.strikerId === playerId);
            if (playerBalls.length > 0) {
                inningsBatted++;
                let matchRuns = 0;
                let isOut = false;

                playerBalls.forEach(b => {
                    if (b.extraType !== 'WD' && b.extraType !== 'NB') {
                        ballsFaced++;
                    }
                    // Runs off bat logic
                    if (!['WD', 'NB', 'LB', 'B'].includes(b.extraType || '')) {
                        totalRuns += b.runs;
                        matchRuns += b.runs;
                    } else if (b.extraType === 'NB') {
                         totalRuns += b.runs;
                         matchRuns += b.runs;
                    }
                    
                    if (b.runs === 4 && !b.extraType) fours++;
                    if (b.runs === 6 && !b.extraType) sixes++;
                });

                // Check dismissal
                if (inn.balls.some(b => b.dismissedPlayerId === playerId)) {
                    isOut = true;
                } else {
                    notOuts++;
                }

                if (matchRuns > highestScore) highestScore = matchRuns;
                if (matchRuns >= 100) centuries++;
                else if (matchRuns >= 50) fifties++;
            }

            // Bowling
            const bowlerBalls = inn.balls.filter(b => b.bowlerId === playerId);
            if (bowlerBalls.length > 0) {
                inningsBowled++;
                bowlerBalls.forEach(b => {
                    if (b.extraType !== 'WD' && b.extraType !== 'NB') ballsBowled++;
                    
                    let runs = b.runs;
                    if (b.extraType === 'WD' || b.extraType === 'NB') runs += 1;
                    if (b.extraType === 'LB' || b.extraType === 'B') runs = 0;
                    runsConceded += runs;

                    if (b.isWicket && b.wicketType !== 'RUN_OUT') totalWickets++;
                });
            }
        });
    });

    const battingAvg = (inningsBatted - notOuts) > 0 ? totalRuns / (inningsBatted - notOuts) : totalRuns;
    const strikeRate = ballsFaced > 0 ? (totalRuns / ballsFaced) * 100 : 0;
    const bowlingAvg = totalWickets > 0 ? runsConceded / totalWickets : 0;
    const economy = ballsBowled > 0 ? runsConceded / (ballsBowled / 6) : 0;

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <button onClick={onBack} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Team
            </button>

            {/* Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-8 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 rotate-12 ${playerTeam.color} opacity-10 rounded-full`}></div>
                
                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className={`w-24 h-24 rounded-full ${playerTeam.color} flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                        {player.name.charAt(0)}
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-bold text-slate-800">{player.name}</h1>
                        <div className="flex items-center justify-center md:justify-start gap-3 mt-2 text-slate-500">
                             <span className="flex items-center gap-1"><Award className="w-4 h-4" /> {player.role}</span>
                             <span>•</span>
                             <span className={`font-bold ${playerTeam.color.replace('bg-', 'text-')}`}>{playerTeam.name}</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex justify-center md:justify-end gap-8 mt-6 md:mt-0">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-slate-800">{playerMatches.length}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase">Matches</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">{totalRuns}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase">Runs</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{totalWickets}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase">Wickets</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Batting Stats */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-orange-500" /> Batting Career
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                            <div>
                                <div className="text-sm text-slate-500">Average</div>
                                <div className="text-xl font-bold text-slate-800">{battingAvg > 0 ? battingAvg.toFixed(2) : player.battingAvg?.toFixed(2) || '-'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">Strike Rate</div>
                                <div className="text-xl font-bold text-slate-800">{strikeRate.toFixed(1)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">Highest</div>
                                <div className="text-xl font-bold text-slate-800">{highestScore}{notOuts > 0 && highestScore > 0 ? '*' : ''}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">Innings</div>
                                <div className="text-xl font-bold text-slate-800">{inningsBatted}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">Fours</div>
                                <div className="text-xl font-bold text-slate-800">{fours}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">Sixes</div>
                                <div className="text-xl font-bold text-slate-800">{sixes}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">50s/100s</div>
                                <div className="text-xl font-bold text-slate-800">{fifties}/{centuries}</div>
                            </div>
                        </div>
                    </div>

                    {/* Bowling Stats */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-500" /> Bowling Career
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
                            <div>
                                <div className="text-sm text-slate-500">Wickets</div>
                                <div className="text-xl font-bold text-slate-800">{totalWickets}</div>
                            </div>
                             <div>
                                <div className="text-sm text-slate-500">Economy</div>
                                <div className="text-xl font-bold text-slate-800">{economy.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">Average</div>
                                <div className="text-xl font-bold text-slate-800">{bowlingAvg > 0 ? bowlingAvg.toFixed(2) : player.bowlingAvg?.toFixed(2) || '-'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-slate-500">Overs</div>
                                <div className="text-xl font-bold text-slate-800">{Math.floor(ballsBowled/6)}.{ballsBowled%6}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Match History Column */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <History className="w-5 h-5 text-blue-500" /> Recent Matches
                    </h3>
                    
                    <div className="space-y-4">
                        {playerMatches.length === 0 ? (
                            <p className="text-slate-400 italic text-sm">No match data available.</p>
                        ) : (
                            playerMatches.map(m => {
                                const opponentId = m.homeTeamId === playerTeam.id ? m.awayTeamId : m.homeTeamId;
                                const opponent = teams.find(t => t.id === opponentId);
                                
                                // Calculate specific match stats
                                let runs = 0;
                                let balls = 0;
                                let wkts = 0;
                                let runsConcededMatch = 0;
                                let ballsBowledMatch = 0; // Legal deliveries

                                m.innings.forEach(inn => {
                                    // Batting
                                    inn.balls.filter(b => b.strikerId === playerId).forEach(b => {
                                        if (!['WD', 'NB', 'LB', 'B'].includes(b.extraType || '')) runs += b.runs;
                                        if (b.extraType === 'NB') runs += b.runs;
                                        if (b.extraType !== 'WD' && b.extraType !== 'NB') balls++;
                                    });
                                    // Bowling
                                    inn.balls.filter(b => b.bowlerId === playerId).forEach(b => {
                                         if (b.extraType !== 'WD' && b.extraType !== 'NB') ballsBowledMatch++;
                                         
                                         if (b.isWicket && b.wicketType !== 'RUN_OUT') wkts++;
                                         let r = b.runs;
                                         if (['WD', 'NB'].includes(b.extraType || '')) r += 1;
                                         if (['LB', 'B'].includes(b.extraType || '')) r = 0;
                                         runsConcededMatch += r;
                                    });
                                });

                                return (
                                    <div key={m.id} className="border-b border-slate-50 pb-3 last:border-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-slate-500 uppercase">vs {opponent?.shortName}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(m.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-bold text-slate-800">
                                                {runs} <span className="text-xs font-normal text-slate-500">({balls})</span>
                                            </div>
                                            {ballsBowledMatch > 0 && (
                                                 <div className="text-sm font-bold text-purple-600">
                                                    {wkts}/{runsConcededMatch} <span className="text-xs text-slate-400 font-normal">({Math.floor(ballsBowledMatch/6)}.{ballsBowledMatch%6})</span>
                                                 </div>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {m.venue}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerProfile;
