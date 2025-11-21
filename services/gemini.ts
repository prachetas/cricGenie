import { GoogleGenAI } from "@google/genai";
import { Match, Team, Player, BallEvent, Innings } from '../types';

const getClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API_KEY not found in environment variables.");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const generateBallCommentary = async (
    bowler: Player,
    batsman: Player,
    outcome: string,
    runs: number,
    matchContext: string
): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Great shot!";

    const prompt = `
    Write a single, exciting sentence of cricket commentary.
    Bowler: ${bowler.name} (${bowler.role})
    Batsman: ${batsman.name}
    Outcome: ${outcome} (Runs: ${runs})
    Context: ${matchContext}
    Keep it energetic and brief (max 20 words).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating commentary:", error);
        return `And that's ${runs} runs off the delivery.`;
    }
};

export const generateCoachAdvice = async (
    match: Match,
    currentInnings: Innings,
    battingTeam: Team,
    bowlingTeam: Team
): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Keep the run rate ticking!";

    const score = `${currentInnings.totalRuns}/${currentInnings.wickets}`;
    const overs = currentInnings.oversBowled;
    
    const prompt = `
    You are an expert cricket coach. Analyze the current situation:
    Format: ${match.format}
    Batting Team: ${battingTeam.name}
    Bowling Team: ${bowlingTeam.name}
    Score: ${score} in ${overs} overs.
    
    Provide 2-3 bullet points of strategic advice for the BATTING team captain.
    Keep it tactical (e.g., rotate strike, target specific bowlers, preserve wickets).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating advice:", error);
        return "Focus on rotating the strike and punishing the loose balls.";
    }
};

export const generatePostMatchReport = async (match: Match, winningTeamName: string): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Match completed.";

    const prompt = `
    Write a short post-match summary report (max 100 words) for a cricket match won by ${winningTeamName}.
    Format: ${match.format}.
    Venue: ${match.venue}.
    Make it sound like a news snippet.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating report:", error);
        return `${winningTeamName} won the match at ${match.venue}.`;
    }
};
