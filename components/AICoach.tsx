import React, { useState } from 'react';
import { generateCoachAdvice } from '../services/gemini';
import { Match, Team, Innings } from '../types';
import { BrainCircuit, RefreshCw, MessageSquareQuote } from 'lucide-react';

interface AICoachProps {
    match: Match;
    currentInnings: Innings;
    battingTeam: Team;
    bowlingTeam: Team;
}

const AICoach: React.FC<AICoachProps> = ({ match, currentInnings, battingTeam, bowlingTeam }) => {
    const [advice, setAdvice] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGetAdvice = async () => {
        setLoading(true);
        try {
            const result = await generateCoachAdvice(match, currentInnings, battingTeam, bowlingTeam);
            setAdvice(result);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-indigo-900 font-bold flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-indigo-600" /> 
                    AI Strategy Coach
                </h3>
                <button 
                    onClick={handleGetAdvice}
                    disabled={loading}
                    className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                   {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <MessageSquareQuote className="w-3 h-3" />}
                   {advice ? 'Refresh Advice' : 'Ask Coach'}
                </button>
            </div>

            {loading && (
                <div className="animate-pulse space-y-2">
                    <div className="h-2 bg-indigo-200 rounded w-3/4"></div>
                    <div className="h-2 bg-indigo-200 rounded w-1/2"></div>
                    <div className="h-2 bg-indigo-200 rounded w-5/6"></div>
                </div>
            )}

            {!loading && advice && (
                <div className="prose prose-sm prose-indigo text-indigo-800 bg-white/50 p-3 rounded-lg border border-indigo-100">
                     <div dangerouslySetInnerHTML={{ __html: advice.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
                </div>
            )}

            {!loading && !advice && (
                <p className="text-sm text-indigo-400 italic">
                    Need tactical advice? Click "Ask Coach" to analyze the current match situation using Gemini.
                </p>
            )}
        </div>
    );
};

export default AICoach;