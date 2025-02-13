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
  const [isAdmin, setIsAdmin] = useState(false);

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

  const handleCreateTeam = async () => {
    if (!newTeamName) return;
    try {
      await createTeam({ 
        teamName: newTeamName,
        isAdmin
      });
      setNewTeamName("");
      setIsAdmin(false);
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  if (isTeamsLoading) {
    return <div className="m-5 p-4">Loading teams...</div>;
  }

  return (
    <div className="m-5 p-4">
      <Header name="Teams" />
      <div className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Create New Team</h3>
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Enter team name"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleCreateTeam}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create Team
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAdmin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="isAdmin" className="text-sm text-gray-600">
              Make this an admin team
            </label>
          </div>
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
