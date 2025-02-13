"use client";

import { useGetAuthUserQuery, useGetTeamsQuery, useJoinTeamMutation, useCreateTeamMutation } from "@/state/api";
import Header from "@/components/Header";
import { useState } from "react";

const TeamsPage = () => {
  const { data: teams, isLoading: isTeamsLoading } = useGetTeamsQuery();
  const { data: authData } = useGetAuthUserQuery({});
  const [joinTeam] = useJoinTeamMutation();
  const [createTeam] = useCreateTeamMutation();
  const [newTeamName, setNewTeamName] = useState("");

  const handleJoinTeam = async (teamId: number) => {
    if (!authData?.userDetails?.userId) return;
    try {
      await joinTeam({ 
        teamId, 
        userId: authData.userDetails.userId 
      });
    } catch (error) {
      console.error('Error joining team:', error);
    }
  };

  const handleCreateAdminTeam = async () => {
    if (!newTeamName) return;
    try {
      await createTeam({ 
        teamName: newTeamName,
        isAdmin: true
      });
      setNewTeamName("");
    } catch (error) {
      console.error('Error creating admin team:', error);
    }
  };

  if (isTeamsLoading) {
    return <div className="m-5 p-4">Loading teams...</div>;
  }

  return (
    <div className="m-5 p-4">
      <Header name="Teams" />
      <div className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Create Admin Team</h3>
        <div className="flex gap-4">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Enter team name"
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleCreateAdminTeam}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Create Admin Team
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4">
        {teams?.map((team) => (
          <div key={team.id} className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">{team.teamName}</h3>
                <p className="text-sm text-gray-600">
                  {team.isAdmin ? 'Admin Team' : 'Regular Team'}
                </p>
              </div>
              <button
                onClick={() => handleJoinTeam(team.id)}
                className={`px-4 py-2 rounded ${
                  authData?.userDetails?.teamId === team.id
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                disabled={authData?.userDetails?.teamId === team.id}
              >
                {authData?.userDetails?.teamId === team.id ? 'Current Team' : 'Join Team'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamsPage;
