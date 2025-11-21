
import React, { useState } from 'react';
import { Team, Player, PlayerRole } from '../types';
import { Plus, User, Users, Trash2, Shield, Pencil, X, Save, Activity, ArrowLeft, Eye } from 'lucide-react';

interface TeamManagerProps {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  onBack?: () => void;
  onViewPlayerProfile: (playerId: string) => void;
}

const TeamManager: React.FC<TeamManagerProps> = ({ teams, setTeams, onBack, onViewPlayerProfile }) => {
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<PlayerRole>(PlayerRole.BATSMAN);
  
  // Edit State
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const handleAddTeam = () => {
    if (!newTeamName.trim()) return;
    const newTeam: Team = {
      id: `team_${Date.now()}`,
      name: newTeamName,
      shortName: newTeamName.substring(0, 3).toUpperCase(),
      color: 'bg-gray-600',
      players: []
    };
    setTeams([...teams, newTeam]);
    setNewTeamName('');
  };

  const handleAddPlayer = () => {
    if (!selectedTeamId || !newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: `player_${Date.now()}`,
      name: newPlayerName,
      role: newPlayerRole,
      battingAvg: 0,
      bowlingAvg: 0
    };
    
    setTeams(prevTeams => prevTeams.map(t => {
      if (t.id === selectedTeamId) {
        return { ...t, players: [...t.players, newPlayer] };
      }
      return t;
    }));
    setNewPlayerName('');
  };

  const handleDeleteTeam = (id: string) => {
    if (window.confirm('Delete this team?')) {
        setTeams(teams.filter(t => t.id !== id));
        if (selectedTeamId === id) setSelectedTeamId(null);
    }
  };

  const handleDeletePlayer = (playerId: string) => {
      if (!selectedTeamId) return;
      if (window.confirm('Remove this player?')) {
          setTeams(prevTeams => prevTeams.map(t => {
              if (t.id === selectedTeamId) {
                  return { ...t, players: t.players.filter(p => p.id !== playerId) };
              }
              return t;
          }));
      }
  };

  const handleSavePlayer = () => {
      if (!selectedTeamId || !editingPlayer) return;
      
      setTeams(prevTeams => prevTeams.map(t => {
          if (t.id === selectedTeamId) {
              return {
                  ...t,
                  players: t.players.map(p => p.id === editingPlayer.id ? editingPlayer : p)
              };
          }
          return t;
      }));
      setEditingPlayer(null);
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div className="p-6 max-w-6xl mx-auto relative">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" /> Team Management
          </h2>
          {onBack && (
              <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium">
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </button>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team List Column */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-slate-700">Teams</h3>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="New Team Name"
              className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button 
              onClick={handleAddTeam}
              className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {teams.map(team => (
              <div 
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                  selectedTeamId === team.id 
                    ? 'bg-emerald-50 border border-emerald-200 shadow-sm' 
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${team.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {team.shortName}
                  </div>
                  <span className="font-medium text-slate-700">{team.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.id); }}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Team Details / Player List */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          {selectedTeam ? (
            <>
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                   <div className={`w-12 h-12 rounded-full ${selectedTeam.color} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                    {selectedTeam.shortName}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedTeam.name}</h3>
                    <p className="text-slate-500 text-sm">{selectedTeam.players.length} Players</p>
                  </div>
                </div>
              </div>

              <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Add Player</h4>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Player Name"
                    className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <select 
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value as PlayerRole)}
                    className="px-3 py-2 border rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.values(PlayerRole).map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleAddPlayer}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedTeam.players.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:shadow-md transition-shadow group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{player.name}</p>
                        <p className="text-xs text-emerald-600 font-medium">{player.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                       <button 
                          onClick={() => onViewPlayerProfile(player.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="View Profile"
                       >
                          <Eye className="w-4 h-4" />
                       </button>
                       <button 
                          onClick={() => setEditingPlayer(player)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit Profile"
                       >
                          <Pencil className="w-4 h-4" />
                       </button>
                       <button 
                          onClick={() => handleDeletePlayer(player.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove Player"
                       >
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                ))}
                {selectedTeam.players.length === 0 && (
                   <div className="col-span-full py-10 text-center text-slate-400 italic">
                     No players added yet.
                   </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Shield className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a team to view or manage players</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" /> Edit Player Profile
              </h3>
              <button 
                onClick={() => setEditingPlayer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Player Name</label>
                <input 
                  type="text"
                  value={editingPlayer.name}
                  onChange={(e) => setEditingPlayer({...editingPlayer, name: e.target.value})}
                  className="w-full p-3 border rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                <select 
                  value={editingPlayer.role}
                  onChange={(e) => setEditingPlayer({...editingPlayer, role: e.target.value as PlayerRole})}
                  className="w-full p-3 border rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {Object.values(PlayerRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Batting Avg
                   </label>
                   <input 
                      type="number"
                      value={editingPlayer.battingAvg || 0}
                      onChange={(e) => setEditingPlayer({...editingPlayer, battingAvg: parseFloat(e.target.value)})}
                      className="w-full p-3 border rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Bowling Avg
                   </label>
                   <input 
                      type="number"
                      value={editingPlayer.bowlingAvg || 0}
                      onChange={(e) => setEditingPlayer({...editingPlayer, bowlingAvg: parseFloat(e.target.value)})}
                      className="w-full p-3 border rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setEditingPlayer(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSavePlayer}
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManager;
