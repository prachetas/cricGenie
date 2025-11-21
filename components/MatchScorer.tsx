
import React, { useState, useEffect, useRef } from 'react';
import { Match, Team, Player, BallEvent, Innings, MatchStatus, WicketType, PlayerRole } from '../types';
import { generateBallCommentary, generatePostMatchReport } from '../services/gemini';
import { PlayCircle, CheckCircle2, Mic2, BarChart3, AlertCircle, UserPlus, Shield, Trophy, Table, ChevronDown, ChevronUp, X, RefreshCw, Users, AlertTriangle, Edit2, Flag, Sparkles, RotateCcw } from 'lucide-react';
import AICoach from './AICoach';

interface MatchScorerProps {
  match: Match;
  teams: Team[];
  onUpdateMatch: (match: Match) => void;
  onExit: () => void;
}

// --- Helper Types ---
interface BattingStats {
    playerId: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    isOut: boolean;
    wicketInfo?: string;
}

interface BowlingStats {
    playerId: string;
    overs: number; // formatted as 2.4
    ballsBowled: number;
    runsConceded: number;
    wickets: number;
    economy: number;
    maidens: number;
}

type ExtraMode = 'NONE' | 'WD' | 'NB' | 'LB' | 'B';

const MatchScorer: React.FC<MatchScorerProps> = ({ match, teams, onUpdateMatch, onExit }) => {
  const homeTeam = teams.find(t => t.id === match.homeTeamId);
  const awayTeam = teams.find(t => t.id === match.awayTeamId);
  
  // --- Scoring State ---
  const [currentStrikerId, setCurrentStrikerId] = useState<string>('');
  const [currentNonStrikerId, setCurrentNonStrikerId] = useState<string>('');
  const [currentBowlerId, setCurrentBowlerId] = useState<string>('');
  
  // --- Extra Mode State ---
  const [extraMode, setExtraMode] = useState<ExtraMode>('NONE');
  
  // --- UX/UI State ---
  const [showScorecard, setShowScorecard] = useState(false);
  const [loadingCommentary, setLoadingCommentary] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [postMatchReport, setPostMatchReport] = useState<string | null>(null);
  const commentaryEndRef = useRef<HTMLDivElement>(null);

  // --- Modals State ---
  const [modalStep, setModalStep] = useState<'NONE' | 'TOSS' | 'OPENERS' | 'NEW_BATSMAN' | 'NEW_BOWLER' | 'WICKET' | 'INNINGS_BREAK' | 'MATCH_OVER' | 'CORRECTION' | 'CONCLUDE_MATCH'>('NONE');

  // --- Temporary Selection State for Modals ---
  const [tempStriker, setTempStriker] = useState('');
  const [tempNonStriker, setTempNonStriker] = useState('');
  const [tempBowler, setTempBowler] = useState('');
  const [tempNewBatsman, setTempNewBatsman] = useState('');
  const [nextBallStriker, setNextBallStriker] = useState(''); // To explicitly choose who faces next

  // Toss Specific
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'BAT' | 'BOWL'>('BAT');

  // Wicket Specific
  const [wicketType, setWicketType] = useState<WicketType>('CAUGHT');
  const [wicketFielder, setWicketFielder] = useState('');
  const [wicketDismissedPlayer, setWicketDismissedPlayer] = useState('');

  // Derived Data
  const currentInningsIndex = match.currentInningsIndex;
  const currentInnings = match.innings[currentInningsIndex];
  
  // Determine batting/bowling teams based on innings or toss
  let battingTeamId = match.homeTeamId;
  let bowlingTeamId = match.awayTeamId;

  if (match.innings.length > 0) {
      battingTeamId = currentInnings.battingTeamId;
      bowlingTeamId = currentInnings.bowlingTeamId;
  } else if (match.tossWinnerId) {
      if (match.tossWinnerId === match.homeTeamId) {
          battingTeamId = match.tossDecision === 'BAT' ? match.homeTeamId : match.awayTeamId;
      } else {
          battingTeamId = match.tossDecision === 'BAT' ? match.awayTeamId : match.homeTeamId;
      }
      bowlingTeamId = battingTeamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
  }

  const battingTeam = teams.find(t => t.id === battingTeamId);
  const bowlingTeam = teams.find(t => t.id === bowlingTeamId);

  // --- Initialization ---
  useEffect(() => {
      if (!match || !homeTeam || !awayTeam) return;

      // If Completed
      if (match.status === MatchStatus.COMPLETED) {
          if (modalStep !== 'MATCH_OVER') setShowScorecard(true);
          return;
      }

      // Toss Check
      if (match.innings.length === 0 && !match.tossWinnerId) {
          setModalStep('TOSS');
          return;
      }

      // Resume or Start Innings
      if (match.innings.length > 0) {
          const inn = match.innings[match.currentInningsIndex];
          
          if (inn.isClosed) {
              if (match.currentInningsIndex === 0 && match.innings.length === 1) {
                  setModalStep('INNINGS_BREAK');
              } else {
                  setModalStep('MATCH_OVER');
              }
          } else if (inn.balls.length === 0) {
               if (modalStep === 'NONE' && !currentStrikerId) setModalStep('OPENERS');
          } else {
              // Resume state from last ball
              if (!currentStrikerId || !currentBowlerId) {
                const lastBall = inn.balls[inn.balls.length - 1];
                setCurrentStrikerId(lastBall.strikerId);
                setCurrentNonStrikerId(lastBall.nonStrikerId);
                setCurrentBowlerId(lastBall.bowlerId);
                
                const validBalls = inn.balls.filter(b => b.overNumber === lastBall.overNumber && !['WD', 'NB'].includes(b.extraType || '')).length;
                if (validBalls >= 6) {
                    setModalStep('NEW_BOWLER');
                }
              }
          }
      } else if (match.tossWinnerId && match.innings.length === 0) {
           startFirstInnings();
      }
  }, [match.id, match.status]);

  useEffect(() => {
    commentaryEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentInnings?.balls.length]);

  // --- Helpers ---
  const getBattingStats = (teamId: string, innings: Innings | undefined): BattingStats[] => {
      const team = teams.find(t => t.id === teamId);
      if (!team || !innings) return [];
      
      const stats: Record<string, BattingStats> = {};
      team.players.forEach(p => {
          stats[p.id] = { playerId: p.id, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false };
      });

      innings.balls.forEach(ball => {
          const p = stats[ball.strikerId];
          if (p) {
              if (!['WD', 'NB', 'LB', 'B'].includes(ball.extraType || '')) {
                  p.balls++;
                  p.runs += ball.runs;
              } else if (ball.extraType === 'NB') {
                  p.balls++;
                  p.runs += ball.runs;
              }
              else if (ball.extraType === 'LB' || ball.extraType === 'B') {
                   p.balls++;
              }

              if (ball.runs === 4 && (ball.extraType !== 'WD' && ball.extraType !== 'LB' && ball.extraType !== 'B')) p.fours++;
              if (ball.runs === 6 && (ball.extraType !== 'WD' && ball.extraType !== 'LB' && ball.extraType !== 'B')) p.sixes++;
          }
          if (ball.isWicket && ball.dismissedPlayerId) {
              stats[ball.dismissedPlayerId].isOut = true;
              stats[ball.dismissedPlayerId].wicketInfo = `${ball.wicketType?.replace('_', ' ')} ${ball.fielderId ? `(b. ${teams.find(t => t.id !== teamId)?.players.find(pl => pl.id === ball.bowlerId)?.name}, c. ${teams.find(t => t.id !== teamId)?.players.find(pl => pl.id === ball.fielderId)?.name})` : `b. ${teams.find(t => t.id !== teamId)?.players.find(pl => pl.id === ball.bowlerId)?.name}`}`;
          }
      });

      return Object.values(stats).filter(s => s.balls > 0 || s.isOut || s.playerId === currentStrikerId || s.playerId === currentNonStrikerId).map(s => ({
          ...s,
          strikeRate: s.balls > 0 ? (s.runs / s.balls) * 100 : 0
      }));
  };

  const getBowlingStats = (teamId: string, innings: Innings | undefined): BowlingStats[] => {
      const team = teams.find(t => t.id === teamId);
      if (!team || !innings) return [];

      const stats: Record<string, BowlingStats> = {};
      team.players.forEach(p => {
          stats[p.id] = { playerId: p.id, overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0, economy: 0, maidens: 0 };
      });

      const overRuns: Record<string, Record<number, number>> = {};

      innings.balls.forEach(ball => {
          if (!stats[ball.bowlerId]) return;
          const b = stats[ball.bowlerId];
          
          if (!['WD', 'NB'].includes(ball.extraType || '')) {
            b.ballsBowled++;
          }

          let runs = ball.runs;
          if (ball.extraType === 'WD' || ball.extraType === 'NB') runs += 1;
          if (ball.extraType === 'LB' || ball.extraType === 'B') runs = 0;
          
          b.runsConceded += runs;

          if (ball.isWicket && ball.wicketType !== 'RUN_OUT') {
              b.wickets++;
          }
          
          if (!overRuns[ball.bowlerId]) overRuns[ball.bowlerId] = {};
          if (!overRuns[ball.bowlerId][ball.overNumber]) overRuns[ball.bowlerId][ball.overNumber] = 0;
          overRuns[ball.bowlerId][ball.overNumber] += runs;
      });

      Object.keys(stats).forEach(bid => {
          const s = stats[bid];
          const fullOvers = Math.floor(s.ballsBowled / 6);
          const remainder = s.ballsBowled % 6;
          s.overs = parseFloat(`${fullOvers}.${remainder}`);
          s.economy = s.overs > 0 ? s.runsConceded / (s.ballsBowled/6) : 0;
          
          if (overRuns[bid]) {
            Object.values(overRuns[bid]).forEach(r => {
                if (r === 0) s.maidens++;
            });
          }
      });

      return Object.values(stats).filter(s => s.ballsBowled > 0);
  };

  // --- Core Logic Actions ---

  const startFirstInnings = () => {
    const firstInnings: Innings = {
        battingTeamId: tossDecision === 'BAT' ? (tossWinner === match.homeTeamId ? match.homeTeamId : match.awayTeamId) : (tossWinner === match.homeTeamId ? match.awayTeamId : match.homeTeamId),
        bowlingTeamId: tossDecision === 'BAT' ? (tossWinner === match.homeTeamId ? match.awayTeamId : match.homeTeamId) : (tossWinner === match.homeTeamId ? match.homeTeamId : match.awayTeamId),
        totalRuns: 0,
        wickets: 0,
        oversBowled: 0,
        balls: [],
        isClosed: false
    };
    
    const updatedMatch = { 
        ...match, 
        tossWinnerId: tossWinner, 
        tossDecision, 
        innings: [firstInnings],
        status: MatchStatus.LIVE 
    };
    onUpdateMatch(updatedMatch);
    setModalStep('OPENERS');
  };

  const handleTossSubmit = () => {
      if (!tossWinner) return;
      startFirstInnings();
  };

  const handleOpenersSubmit = () => {
      if (!tempStriker || !tempNonStriker || !tempBowler || tempStriker === tempNonStriker) return;
      
      setCurrentStrikerId(tempStriker);
      setCurrentNonStrikerId(tempNonStriker);
      setCurrentBowlerId(tempBowler);
      setModalStep('NONE');
  };

  const handleBallClick = async (runsScored: number) => {
      if (!currentInnings || !battingTeam || !bowlingTeam) return;
      if (currentInnings.isClosed || match.status === MatchStatus.COMPLETED) return;

      const isExtra = extraMode !== 'NONE';
      const extraType = extraMode === 'NONE' ? undefined : extraMode as 'WD' | 'NB' | 'LB' | 'B';
      
      let actualRuns = runsScored;
      let totalRunsForBall = 0;

      if (extraMode === 'WD') {
          actualRuns = runsScored; 
          totalRunsForBall = 1 + runsScored;
      } else if (extraMode === 'NB') {
          actualRuns = runsScored;
          totalRunsForBall = 1 + runsScored;
      } else if (extraMode === 'LB' || extraMode === 'B') {
          actualRuns = runsScored;
          totalRunsForBall = runsScored;
      } else {
          actualRuns = runsScored;
          totalRunsForBall = runsScored;
      }

      let commentary = '';
      const bowler = bowlingTeam.players.find(p => p.id === currentBowlerId)!;
      const batsman = battingTeam.players.find(p => p.id === currentStrikerId)!;
      
      if (extraMode === 'WD') commentary = `Wide ball! ${runsScored > 0 ? `Plus ${runsScored} runs ran.` : ''}`;
      else if (extraMode === 'NB') commentary = `No Ball! ${runsScored > 0 ? `Hit for ${runsScored} runs.` : 'Free hit coming up.'}`;
      else if (extraMode === 'LB') commentary = `Leg Bye, ${runsScored} runs.`;
      else if (extraMode === 'B') commentary = `Byes, ${runsScored} runs.`;
      else if (actualRuns === 4) commentary = "Four runs! Great shot.";
      else if (actualRuns === 6) commentary = "Six! That's huge.";
      else if (actualRuns === 0) commentary = "No run.";
      else commentary = `${actualRuns} run${actualRuns > 1 ? 's' : ''} taken.`;

      if (isAIEnabled) {
        setLoadingCommentary(true);
        const context = `${currentInnings.totalRuns}/${currentInnings.wickets} (${currentInnings.oversBowled})`;
        const outcome = isExtra ? `${extraType} + ${runsScored}` : `${runsScored} runs`;
        generateBallCommentary(bowler, batsman, outcome, totalRunsForBall, context).then(c => {
            // Fire and forget
        });
        commentary = await generateBallCommentary(bowler, batsman, outcome, totalRunsForBall, context);
        setLoadingCommentary(false);
      }

      const legalBalls = currentInnings.balls.filter(b => !['WD', 'NB'].includes(b.extraType || '')).length;
      const currentOverNumber = Math.floor(legalBalls / 6);
      const ballInOver = (legalBalls % 6) + 1;

      const newBall: BallEvent = {
          ballNumber: ballInOver,
          overNumber: currentOverNumber,
          bowlerId: currentBowlerId,
          strikerId: currentStrikerId,
          nonStrikerId: currentNonStrikerId,
          runs: actualRuns,
          isWicket: false,
          isExtra,
          extraType,
          commentary
      };

      const updatedInnings = { ...currentInnings };
      updatedInnings.balls.push(newBall);
      updatedInnings.totalRuns += totalRunsForBall;
      
      const newLegalBalls = updatedInnings.balls.filter(b => !['WD', 'NB'].includes(b.extraType || '')).length;
      updatedInnings.oversBowled = parseFloat(`${Math.floor(newLegalBalls / 6)}.${newLegalBalls % 6}`);

      // Strike Rotation
      let nextStriker = currentStrikerId;
      let nextNonStriker = currentNonStrikerId;

      if (runsScored % 2 !== 0) {
          [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
      }

      const isOverComplete = (newLegalBalls % 6 === 0) && (!['WD', 'NB'].includes(extraType || ''));
      
      if (isOverComplete) {
          [nextStriker, nextNonStriker] = [nextNonStriker, nextStriker];
      }

      const updatedMatch = { ...match };
      updatedMatch.innings[currentInningsIndex] = updatedInnings;
      
      setCurrentStrikerId(nextStriker);
      setCurrentNonStrikerId(nextNonStriker);
      onUpdateMatch(updatedMatch);
      setExtraMode('NONE');

      // Check for Target Reached (Win) - 2nd Innings
      if (currentInningsIndex === 1) {
          const target = match.innings[0].totalRuns;
          if (updatedInnings.totalRuns > target) {
              // Batting team wins immediately
              concludeMatch(updatedMatch);
              return;
          }
      }

      if (match.maxOvers && updatedInnings.oversBowled >= match.maxOvers) {
          endInnings(updatedMatch);
      } else if (isOverComplete) {
          setModalStep('NEW_BOWLER');
      }
  };

  const handleWicketClick = () => {
      if (currentInnings.isClosed || match.status === MatchStatus.COMPLETED) return;
      setWicketDismissedPlayer(currentStrikerId); 
      setModalStep('WICKET');
  };

  const handleWicketConfirm = async () => {
      if (!wicketDismissedPlayer) return;
      
      const bowler = bowlingTeam?.players.find(p => p.id === currentBowlerId)!;
      const batsman = battingTeam?.players.find(p => p.id === wicketDismissedPlayer)!;
      
      let commentary = `OUT! ${batsman.name} is gone!`;
      if (isAIEnabled) {
          setLoadingCommentary(true);
          commentary = await generateBallCommentary(bowler, batsman, `WICKET (${wicketType})`, 0, "Critical wicket!");
          setLoadingCommentary(false);
      }

      const legalBalls = currentInnings.balls.filter(b => !['WD', 'NB'].includes(b.extraType || '')).length;
      const currentOverNumber = Math.floor(legalBalls / 6);
      const ballInOver = (legalBalls % 6) + 1;

      const newBall: BallEvent = {
          ballNumber: ballInOver,
          overNumber: currentOverNumber,
          bowlerId: currentBowlerId,
          strikerId: currentStrikerId,
          nonStrikerId: currentNonStrikerId,
          runs: 0,
          isWicket: true,
          wicketType,
          dismissedPlayerId: wicketDismissedPlayer,
          fielderId: wicketType === 'CAUGHT' || wicketType === 'RUN_OUT' || wicketType === 'STUMPED' ? wicketFielder : undefined,
          isExtra: false,
          commentary
      };

      const updatedInnings = { ...currentInnings };
      updatedInnings.balls.push(newBall);
      updatedInnings.wickets += 1;
      
      const newLegalBalls = updatedInnings.balls.filter(b => !['WD', 'NB'].includes(b.extraType || '')).length;
      updatedInnings.oversBowled = parseFloat(`${Math.floor(newLegalBalls / 6)}.${newLegalBalls % 6}`);

      const updatedMatch = { ...match };
      updatedMatch.innings[currentInningsIndex] = updatedInnings;
      onUpdateMatch(updatedMatch);

      // Dynamic All Out Check: Team is all out if wickets >= totalPlayers - 1 (assuming 1 man standing)
      // We use battingTeam.players.length to allow flexible team sizes (e.g. 5 vs 5)
      if (updatedInnings.wickets >= battingTeam!.players.length - 1) {
           endInnings(updatedMatch);
           setModalStep('NONE');
      } else {
           setTempNewBatsman('');
           setNextBallStriker(''); 
           setModalStep('NEW_BATSMAN');
      }
  };

  const handleNewBatsmanSubmit = () => {
      if (!tempNewBatsman || !nextBallStriker) return;
      
      const survivor = wicketDismissedPlayer === currentStrikerId ? currentNonStrikerId : currentStrikerId;
      const newStriker = nextBallStriker;
      const newNonStriker = newStriker === tempNewBatsman ? survivor : tempNewBatsman;

      const legalBalls = currentInnings.balls.filter(b => !['WD', 'NB'].includes(b.extraType || '')).length;
      const isOverComplete = (legalBalls > 0) && (legalBalls % 6 === 0);
      
      if (match.maxOvers && currentInnings.oversBowled >= match.maxOvers) {
        endInnings(match);
        return;
      }

      if (isOverComplete) {
          setCurrentStrikerId(newNonStriker);
          setCurrentNonStrikerId(newStriker);
          setModalStep('NEW_BOWLER');
      } else {
          setCurrentStrikerId(newStriker);
          setCurrentNonStrikerId(newNonStriker);
          setModalStep('NONE');
      }
  };

  const handleChangeBowlerSubmit = () => {
      if (!tempBowler || tempBowler === currentBowlerId) return;
      setCurrentBowlerId(tempBowler);
      setModalStep('NONE');
  };

  const handleCorrectionSubmit = () => {
      if (tempStriker) setCurrentStrikerId(tempStriker);
      if (tempNonStriker) setCurrentNonStrikerId(tempNonStriker);
      if (tempBowler) setCurrentBowlerId(tempBowler);
      setModalStep('NONE');
  };

  const endInnings = (currentMatchState: Match) => {
      const updatedMatch = { ...currentMatchState };
      const inn = updatedMatch.innings[currentInningsIndex];
      inn.isClosed = true;

      if (currentInningsIndex === 0) {
           setModalStep('INNINGS_BREAK');
      } else {
           concludeMatch(updatedMatch);
      }
      onUpdateMatch(updatedMatch);
  };

  const startSecondInnings = () => {
      const secondInnings: Innings = {
          battingTeamId: currentInnings.bowlingTeamId,
          bowlingTeamId: currentInnings.battingTeamId,
          totalRuns: 0,
          wickets: 0,
          oversBowled: 0,
          balls: [],
          isClosed: false
      };
      
      const updatedMatch = {
          ...match,
          currentInningsIndex: 1,
          innings: [...match.innings, secondInnings]
      };
      
      setCurrentStrikerId('');
      setCurrentNonStrikerId('');
      setCurrentBowlerId('');
      
      onUpdateMatch(updatedMatch);
      setModalStep('OPENERS');
  };

  const concludeMatch = async (finalMatchState: Match) => {
      const inn1 = finalMatchState.innings[0];
      const inn2 = finalMatchState.innings[1];
      
      let winnerId: string | undefined = undefined;

      if (inn2) {
          if (inn2.totalRuns > inn1.totalRuns) {
              winnerId = inn2.battingTeamId;
          } else if (inn1.totalRuns > inn2.totalRuns) {
              winnerId = inn1.battingTeamId;
          }
      } else {
          // Abandoned or ended in 1st innings? Usually Draw unless declared
      }

      const completedMatch = { 
          ...finalMatchState, 
          status: MatchStatus.COMPLETED, 
          winnerTeamId: winnerId 
      };
      
      onUpdateMatch(completedMatch);
      setModalStep('MATCH_OVER');

      const winnerName = teams.find(t => t.id === winnerId)?.name || 'Draw';
      const report = await generatePostMatchReport(completedMatch, winnerName);
      setPostMatchReport(report);
  };

  const handleManualConclude = () => {
      concludeMatch(match);
      setModalStep('MATCH_OVER');
  }

  const handleViewScorecardFromModal = () => {
      setModalStep('NONE');
      setShowScorecard(true);
  }

  // --- Renderers ---

  if (!battingTeam || !bowlingTeam) return <div>Loading...</div>;

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500 font-medium">{match.venue}</div>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">{match.format}</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">{match.innings.length === 2 ? '2nd Innings' : '1st Innings'}</span>
        </div>
        <div className="flex gap-3">
            {match.status !== MatchStatus.COMPLETED && (
                <>
                <button onClick={() => {
                    setTempStriker(currentStrikerId);
                    setTempNonStriker(currentNonStrikerId);
                    setTempBowler(currentBowlerId);
                    setModalStep('CORRECTION');
                }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" title="Correction">
                    <Edit2 className="w-5 h-5" />
                </button>
                <button onClick={() => setModalStep('CONCLUDE_MATCH')} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Finish Match">
                    <Flag className="w-5 h-5" />
                </button>
                </>
            )}
             <button onClick={() => setShowScorecard(!showScorecard)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors" title="Scorecard">
                <Table className="w-5 h-5" />
            </button>
            <button onClick={onExit} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Exit">
                <X className="w-5 h-5" />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {!currentInnings ? (
            <div className="flex h-full items-center justify-center flex-col text-slate-400">
                <RefreshCw className="w-10 h-10 mb-4 animate-spin text-emerald-500" />
                <p>Initializing match innings...</p>
            </div>
        ) : (
            <>
            {/* Score Banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6 flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <div className={`w-16 h-16 rounded-full ${battingTeam.color} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                        {battingTeam.shortName}
                    </div>
                    <div>
                        <h2 className="text-4xl font-bold text-slate-800">
                            {currentInnings.totalRuns}<span className="text-slate-400 text-2xl">/{currentInnings.wickets}</span>
                        </h2>
                        <p className="text-slate-500 font-medium">Overs: {currentInnings.oversBowled} <span className="text-xs bg-slate-100 px-1 rounded">Max {match.maxOvers}</span></p>
                        <p className="text-sm text-slate-400 mt-1">Run Rate: {currentInnings.oversBowled > 0 ? (currentInnings.totalRuns / currentInnings.oversBowled).toFixed(2) : '0.00'}</p>
                    </div>
                </div>
                
                {match.innings.length === 2 && (
                    <div className="bg-indigo-50 px-4 py-2 rounded-lg text-indigo-800 text-sm font-medium border border-indigo-100 text-center">
                        Target: {match.innings[0].totalRuns + 1} <br/>
                        Need {match.innings[0].totalRuns + 1 - currentInnings.totalRuns} off {(match.maxOvers * 6) - Math.floor(currentInnings.oversBowled * 6) - ((currentInnings.oversBowled % 1) * 10)} balls
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-700">{bowlingTeam.name}</div>
                        <div className="text-xs text-slate-400">Fielding</div>
                    </div>
                    <div className={`w-12 h-12 rounded-full ${bowlingTeam.color} flex items-center justify-center text-white font-bold shadow`}>
                        {bowlingTeam.shortName}
                    </div>
                </div>
            </div>

            {showScorecard || match.status === MatchStatus.COMPLETED ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b font-bold text-slate-700 flex justify-between">
                        Full Scorecard
                        {match.status === MatchStatus.COMPLETED && <span className="text-emerald-600">{postMatchReport}</span>}
                    </div>
                    <div className="p-6 space-y-8">
                        {match.innings.map((inn, idx) => {
                            const team = teams.find(t => t.id === inn.battingTeamId);
                            const bowlTeam = teams.find(t => t.id === inn.bowlingTeamId);
                            return (
                                <div key={idx}>
                                    <h3 className="font-bold text-lg mb-3 bg-slate-100 p-2 rounded text-slate-800">{team?.name} Innings ({inn.totalRuns}/{inn.wickets})</h3>
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                                <tr><th className="px-4 py-2">Batter</th><th className="px-4 py-2">Dismissal</th><th className="px-4 py-2 text-right">R</th><th className="px-4 py-2 text-right">B</th><th className="px-4 py-2 text-right">4s</th><th className="px-4 py-2 text-right">6s</th><th className="px-4 py-2 text-right">SR</th></tr>
                                            </thead>
                                            <tbody>
                                                {getBattingStats(team!.id, inn).map(s => (
                                                    <tr key={s.playerId} className="border-b border-slate-50">
                                                        <td className="px-4 py-2 font-medium text-slate-700">{team?.players.find(p => p.id === s.playerId)?.name}{!s.isOut && (idx === currentInningsIndex) && '*'}</td>
                                                        <td className="px-4 py-2 text-slate-500">{s.isOut ? s.wicketInfo : 'Not Out'}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-slate-900">{s.runs}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{s.balls}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{s.fours}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{s.sixes}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{s.strikeRate.toFixed(1)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div className="overflow-x-auto">
                                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-2 px-2">Bowling</h4>
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                                                <tr>
                                                    <th className="px-4 py-2">Bowler</th>
                                                    <th className="px-4 py-2 text-right">O</th>
                                                    <th className="px-4 py-2 text-right">M</th>
                                                    <th className="px-4 py-2 text-right">R</th>
                                                    <th className="px-4 py-2 text-right">W</th>
                                                    <th className="px-4 py-2 text-right">Eco</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getBowlingStats(bowlTeam!.id, inn).map(s => (
                                                    <tr key={s.playerId} className="border-b border-slate-50">
                                                        <td className="px-4 py-2 font-medium text-slate-700">{bowlTeam?.players.find(p => p.id === s.playerId)?.name}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{s.overs}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{s.maidens}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{s.runsConceded}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-slate-900">{s.wickets}</td>
                                                        <td className="px-4 py-2 text-right text-slate-600">{s.economy.toFixed(1)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
            <div className="space-y-6">
                
                {/* Top Section: Scoring Controls and Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Cards Column */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Batting Card */}
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Batting</h3>
                            <div className="space-y-3">
                                <div className={`flex justify-between items-center p-3 rounded-lg border-l-4 ${currentStrikerId ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-300'}`}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800">{battingTeam.players.find(p => p.id === currentStrikerId)?.name}</span>
                                            <span className="text-xs bg-emerald-600 text-white px-1.5 rounded">Strike</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{(() => { const s = getBattingStats(battingTeam.id, currentInnings).find(s => s.playerId === currentStrikerId); return s ? `${s.runs} (${s.balls})` : '0 (0)'; })()}</div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center p-3 rounded-lg border-l-4 border-slate-300 bg-slate-50">
                                    <div>
                                        <span className="font-bold text-slate-700">{battingTeam.players.find(p => p.id === currentNonStrikerId)?.name}</span>
                                        <div className="text-xs text-slate-500 mt-1">{(() => { const s = getBattingStats(battingTeam.id, currentInnings).find(s => s.playerId === currentNonStrikerId); return s ? `${s.runs} (${s.balls})` : '0 (0)'; })()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bowling Card */}
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-xs font-bold text-slate-400 uppercase">Bowling</h3>
                                <button onClick={() => setModalStep('NEW_BOWLER')} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Change</button>
                            </div>
                            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <div>
                                    <span className="font-bold text-slate-800 block mb-1">{bowlingTeam.players.find(p => p.id === currentBowlerId)?.name}</span>
                                    <div className="text-xs text-slate-500">{(() => { const s = getBowlingStats(bowlingTeam.id, currentInnings).find(s => s.playerId === currentBowlerId); return s ? `${s.wickets}-${s.runsConceded} (${s.overs})` : '0-0 (0.0)'; })()}</div>
                                </div>
                                <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center"><div className="w-3 h-3 bg-slate-400 rounded-full animate-ping"></div></div>
                            </div>
                        </div>
                    </div>

                    {/* Controls Column */}
                    <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
                        <div>
                            {/* Helper Text for Extras */}
                            {extraMode !== 'NONE' && (
                                <div className="mb-3 text-center">
                                    <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold animate-pulse">
                                        {extraMode === 'NB' ? 'Select Runs off Bat (Total = 1 + runs)' : 
                                         extraMode === 'WD' ? 'Select Runs Ran (Total = 1 + runs)' : 
                                         'Select Runs Ran'}
                                    </span>
                                </div>
                            )}

                            <div className="grid grid-cols-4 gap-3 mb-4">
                                {[0, 1, 2, 3, 4, 6].map(run => (
                                    <button 
                                        key={run}
                                        onClick={() => handleBallClick(run)}
                                        className={`py-4 rounded-xl border font-bold text-xl transition-all
                                            ${extraMode !== 'NONE' 
                                                ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' 
                                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                                            }
                                        `}
                                    >
                                        {run}
                                    </button>
                                ))}
                                <button onClick={handleWicketClick} className="col-span-2 py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xl shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2">
                                    OUT <AlertCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Extras Toggles */}
                        <div className="flex gap-2 justify-center pt-4 border-t border-slate-100">
                            <button 
                                onClick={() => setExtraMode(extraMode === 'WD' ? 'NONE' : 'WD')} 
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${extraMode === 'WD' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                WD
                            </button>
                            <button 
                                onClick={() => setExtraMode(extraMode === 'NB' ? 'NONE' : 'NB')} 
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${extraMode === 'NB' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                NB
                            </button>
                            <button 
                                onClick={() => setExtraMode(extraMode === 'LB' ? 'NONE' : 'LB')} 
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${extraMode === 'LB' ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                LB
                            </button>
                            <button 
                                onClick={() => setExtraMode(extraMode === 'B' ? 'NONE' : 'B')} 
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${extraMode === 'B' ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                BYE
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Commentary & AI */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     {/* AI Coach */}
                    <div className="lg:col-span-1">
                         <AICoach 
                            match={match} 
                            currentInnings={currentInnings} 
                            battingTeam={battingTeam} 
                            bowlingTeam={bowlingTeam} 
                        />
                    </div>

                    {/* Commentary Feed */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[300px]">
                        <div className="bg-slate-50 px-4 py-3 border-b flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <Mic2 className="w-4 h-4 text-slate-500" /> Live Commentary
                            </h3>
                            <button 
                                onClick={() => setIsAIEnabled(!isAIEnabled)} 
                                className={`text-xs flex items-center gap-1 px-2 py-1 rounded-full border ${isAIEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                            >
                                <Sparkles className="w-3 h-3" /> {isAIEnabled ? 'AI ON' : 'AI OFF'}
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-3">
                            {loadingCommentary && (
                                <div className="flex gap-3 animate-pulse">
                                    <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                                        <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                            )}
                            {[...currentInnings.balls].reverse().map((ball, idx) => (
                                <div key={`${ball.overNumber}-${ball.ballNumber}`} className="flex gap-3 border-b border-slate-50 pb-2 last:border-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 
                                        ${ball.isWicket ? 'bg-red-100 text-red-600' : 
                                        ball.runs >= 4 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                        {ball.isWicket ? 'W' : ball.runs + (ball.extraType || '')}
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 font-mono mb-0.5">{ball.overNumber}.{ball.ballNumber}</div>
                                        <p className="text-sm text-slate-600">{ball.commentary}</p>
                                    </div>
                                </div>
                            ))}
                            {currentInnings.balls.length === 0 && <p className="text-slate-400 text-sm italic text-center">Match about to start...</p>}
                            <div ref={commentaryEndRef} />
                        </div>
                    </div>
                </div>
            </div>
            )}
            </>
        )}
      </main>

      {/* --- MODALS --- */}
      
      {/* 1. Toss Modal */}
      {modalStep === 'TOSS' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-2xl font-bold text-slate-800 mb-4 text-center">Match Toss</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Who won the toss?</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setTossWinner(match.homeTeamId)} className={`p-3 rounded-xl border-2 text-slate-800 ${tossWinner === match.homeTeamId ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>{homeTeam?.name}</button>
                            <button onClick={() => setTossWinner(match.awayTeamId)} className={`p-3 rounded-xl border-2 text-slate-800 ${tossWinner === match.awayTeamId ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>{awayTeam?.name}</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Decision?</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setTossDecision('BAT')} className={`p-3 rounded-xl border-2 text-slate-800 ${tossDecision === 'BAT' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>Bat First</button>
                            <button onClick={() => setTossDecision('BOWL')} className={`p-3 rounded-xl border-2 text-slate-800 ${tossDecision === 'BOWL' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>Bowl First</button>
                        </div>
                    </div>
                    <button 
                        onClick={handleTossSubmit}
                        disabled={!tossWinner}
                        className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 disabled:opacity-50 mt-4"
                    >
                        Start Match
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 2. Openers Modal */}
      {modalStep === 'OPENERS' && battingTeam && bowlingTeam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Start {currentInningsIndex === 0 ? '1st' : '2nd'} Innings</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Striker</label>
                        <select className="w-full p-3 border rounded-lg bg-white text-slate-800" onChange={(e) => setTempStriker(e.target.value)}>
                            <option value="">Select Striker</option>
                            {battingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Non-Striker</label>
                        <select className="w-full p-3 border rounded-lg bg-white text-slate-800" onChange={(e) => setTempNonStriker(e.target.value)}>
                            <option value="">Select Non-Striker</option>
                            {battingTeam.players.filter(p => p.id !== tempStriker).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="pt-4 border-t">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Opening Bowler</label>
                        <select className="w-full p-3 border rounded-lg bg-white text-slate-800" onChange={(e) => setTempBowler(e.target.value)}>
                            <option value="">Select Bowler</option>
                            {bowlingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <button onClick={handleOpenersSubmit} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold mt-4">Start Play</button>
                </div>
            </div>
          </div>
      )}

      {/* 3. Wicket Details Modal */}
      {modalStep === 'WICKET' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center gap-2"><AlertTriangle/> Wicket Fall</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Who is Out?</label>
                        <select className="w-full p-3 border rounded-lg text-slate-800 bg-white" value={wicketDismissedPlayer} onChange={(e) => setWicketDismissedPlayer(e.target.value)}>
                            <option value={currentStrikerId}>{battingTeam.players.find(p => p.id === currentStrikerId)?.name} (Striker)</option>
                            <option value={currentNonStrikerId}>{battingTeam.players.find(p => p.id === currentNonStrikerId)?.name} (Non-Striker)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">How?</label>
                        <select className="w-full p-3 border rounded-lg text-slate-800 bg-white" onChange={(e) => setWicketType(e.target.value as WicketType)}>
                            <option value="CAUGHT">Caught</option>
                            <option value="BOWLED">Bowled</option>
                            <option value="LBW">LBW</option>
                            <option value="RUN_OUT">Run Out</option>
                            <option value="STUMPED">Stumped</option>
                            <option value="HIT_WICKET">Hit Wicket</option>
                        </select>
                    </div>
                    {(wicketType === 'CAUGHT' || wicketType === 'RUN_OUT' || wicketType === 'STUMPED') && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Fielder?</label>
                            <select className="w-full p-3 border rounded-lg text-slate-800 bg-white" onChange={(e) => setWicketFielder(e.target.value)}>
                                <option value="">Select Fielder</option>
                                {bowlingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                    <button onClick={handleWicketConfirm} className="w-full bg-red-600 text-white py-3 rounded-xl font-bold mt-4">Confirm Wicket</button>
                </div>
            </div>
          </div>
      )}

      {/* 4. New Batsman Modal */}
      {modalStep === 'NEW_BATSMAN' && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold text-slate-800 mb-4">New Batsman</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Select Incoming Player</label>
                        <select className="w-full p-3 border rounded-lg text-slate-800 bg-white" onChange={(e) => setTempNewBatsman(e.target.value)}>
                            <option value="">Select Player</option>
                            {battingTeam.players
                                .filter(p => 
                                    p.id !== currentStrikerId && 
                                    p.id !== currentNonStrikerId && 
                                    !getBattingStats(battingTeam.id, currentInnings).find(s => s.playerId === p.id)?.isOut
                                )
                                .map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                            }
                        </select>
                    </div>
                    
                    <div className="pt-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Who faces the next ball?</label>
                        <div className="grid grid-cols-2 gap-3">
                            {tempNewBatsman && (
                                <button 
                                    onClick={() => setNextBallStriker(tempNewBatsman)} 
                                    className={`p-3 rounded-lg border text-sm font-medium text-slate-800 ${nextBallStriker === tempNewBatsman ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200'}`}
                                >
                                    {battingTeam.players.find(p => p.id === tempNewBatsman)?.name} (New)
                                </button>
                            )}
                             <button 
                                onClick={() => setNextBallStriker(wicketDismissedPlayer === currentStrikerId ? currentNonStrikerId : currentStrikerId)} 
                                className={`p-3 rounded-lg border text-sm font-medium text-slate-800 ${nextBallStriker === (wicketDismissedPlayer === currentStrikerId ? currentNonStrikerId : currentStrikerId) ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-200'}`}
                            >
                                {battingTeam.players.find(p => p.id === (wicketDismissedPlayer === currentStrikerId ? currentNonStrikerId : currentStrikerId))?.name} (Set)
                            </button>
                        </div>
                    </div>

                    <button disabled={!tempNewBatsman || !nextBallStriker} onClick={handleNewBatsmanSubmit} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold mt-4 disabled:opacity-50">Resume Play</button>
                </div>
            </div>
          </div>
      )}

      {/* 5. New Bowler Modal */}
      {modalStep === 'NEW_BOWLER' && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Select Bowler</h2>
                <div className="space-y-4">
                    <select className="w-full p-3 border rounded-lg text-slate-800 bg-white" onChange={(e) => setTempBowler(e.target.value)}>
                        <option value="">Select Bowler</option>
                        {bowlingTeam.players.map(p => <option key={p.id} value={p.id} disabled={p.id === currentBowlerId}>{p.name}</option>)}
                    </select>
                    <button disabled={!tempBowler} onClick={handleChangeBowlerSubmit} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mt-4 disabled:opacity-50">Start Over</button>
                </div>
            </div>
          </div>
      )}

      {/* 6. Innings Break Modal */}
      {modalStep === 'INNINGS_BREAK' && (
           <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md text-center">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Innings Break</h2>
                <p className="text-slate-500 mb-6">Target: <span className="font-bold text-slate-900">{currentInnings.totalRuns + 1}</span></p>
                <button onClick={startSecondInnings} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold">Start 2nd Innings</button>
            </div>
          </div>
      )}

      {/* 7. Match Over Modal */}
      {modalStep === 'MATCH_OVER' && (
           <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-lg text-center">
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Match Completed</h2>
                <p className="text-xl text-emerald-600 font-bold mb-6">
                    {match.winnerTeamId ? `${teams.find(t => t.id === match.winnerTeamId)?.name} Won!` : 'Match Drawn/Tied'}
                </p>
                <div className="bg-slate-50 p-4 rounded-xl text-left mb-6 text-sm text-slate-600 italic">
                    {postMatchReport || 'Generating report...'}
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={handleViewScorecardFromModal} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700">View Scorecard</button>
                    <button onClick={onExit} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900">Return to Dashboard</button>
                </div>
            </div>
          </div>
      )}
      
      {/* 8. Correction Modal */}
      {modalStep === 'CORRECTION' && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Correct Active Players</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Striker</label>
                        <select className="w-full p-2 border rounded text-slate-800 bg-white" value={tempStriker} onChange={e => setTempStriker(e.target.value)}>
                             {battingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Non-Striker</label>
                        <select className="w-full p-2 border rounded text-slate-800 bg-white" value={tempNonStriker} onChange={e => setTempNonStriker(e.target.value)}>
                             {battingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bowler</label>
                        <select className="w-full p-2 border rounded text-slate-800 bg-white" value={tempBowler} onChange={e => setTempBowler(e.target.value)}>
                             {bowlingTeam.players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setModalStep('NONE')} className="flex-1 py-2 border rounded-lg text-slate-600">Cancel</button>
                        <button onClick={handleCorrectionSubmit} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg">Update</button>
                    </div>
                </div>
            </div>
           </div>
      )}
      
      {/* 9. Conclude Match Confirmation */}
      {modalStep === 'CONCLUDE_MATCH' && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl text-center">
                <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">End Match Now?</h2>
                <p className="text-slate-500 text-sm mb-6">This will mark the match as Completed based on current scores. This action cannot be undone.</p>
                <div className="flex gap-3">
                    <button onClick={() => setModalStep('NONE')} className="flex-1 py-2 border rounded-lg text-slate-600">Cancel</button>
                    <button onClick={handleManualConclude} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Finish Match</button>
                </div>
            </div>
           </div>
      )}

    </div>
  );
};

export default MatchScorer;
