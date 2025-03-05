"use client";

import {
  useGetAuthUserQuery,
  useGetTeamsQuery,
  useGetRolesQuery,
  useJoinTeamMutation,
  useCreateTeamMutation,
  useAddRoleToTeamMutation,
  useRemoveRoleFromTeamMutation
} from "@/state/api";
import Header from "@/components/Header";
import { useState } from "react";
import Modal from "@/components/Modal";
import { Settings, Trash2, Edit, Plus } from "lucide-react";

const TeamsPage = () => {
  const { data: teams, isLoading: isTeamsLoading } = useGetTeamsQuery();
  const { data: roles, isLoading: isRolesLoading } = useGetRolesQuery();
  const { data: authData } = useGetAuthUserQuery({});
  const [joinTeam] = useJoinTeamMutation();
  const [createTeam] = useCreateTeamMutation();
  const [addRoleToTeam] = useAddRoleToTeamMutation();
  const [removeRoleFromTeam] = useRemoveRoleFromTeamMutation();
  
  // State for team creation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  
  // State for team settings
  const [showSettingsFor, setShowSettingsFor] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<any>(null);

  const isUserAdmin = authData?.userDetails?.team?.isAdmin ||
    authData?.userDetails?.team?.teamRoles?.some(tr => tr.role.name === 'ADMIN');

  const handleRoleToggle = (roleId: number) => {
    setSelectedRoleIds(prevSelected =>
      prevSelected.includes(roleId)
        ? prevSelected.filter(id => id !== roleId)
        : [...prevSelected, roleId]
    );
  };

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
        roleIds: selectedRoleIds
      });
      setNewTeamName("");
      setSelectedRoleIds([]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleAddRole = async (teamId: number, roleId: number) => {
    try {
      await addRoleToTeam({ teamId, roleId });
    } catch (error) {
      console.error('Error adding role to team:', error);
    }
  };

  const handleRemoveRole = async (teamId: number, roleId: number) => {
    try {
      await removeRoleFromTeam({ teamId, roleId });
    } catch (error) {
      console.error('Error removing role from team:', error);
    }
  };

  // TODO: Implement these functions when we add backend support
  const handleEditTeam = async (teamId: number, newName: string) => {
    console.log("Edit team", teamId, newName);
    // Will be implemented when backend supports it
    setIsEditModalOpen(false);
  };

  const handleDeleteTeam = async (teamId: number) => {
    console.log("Delete team", teamId);
    // Will be implemented when backend supports it
    setIsDeleteModalOpen(false);
  };

  const openTeamSettings = (teamId: number) => {
    if (showSettingsFor === teamId) {
      setShowSettingsFor(null);
    } else {
      setShowSettingsFor(teamId);
    }
  };

  const openEditModal = (team: any) => {
    setTeamToEdit(team);
    setIsEditModalOpen(true);
    setShowSettingsFor(null);
  };

  const openDeleteModal = (team: any) => {
    setTeamToEdit(team);
    setIsDeleteModalOpen(true);
    setShowSettingsFor(null);
  };

  if (isTeamsLoading || isRolesLoading) {
    return <div className="m-5 p-4">Loading...</div>;
  }

  return (
    <div className="m-5 p-4">
      <Header name="Teams" />
      
      {/* Team creation button (only for admins) */}
      {isUserAdmin && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded flex items-center gap-2 hover:bg-blue-600"
          >
            <Plus size={16} />
            Create New Team
          </button>
        </div>
      )}
      
      {/* Create Team Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setNewTeamName("");
          setSelectedRoleIds([]);
        }}
        name="Create New Team"
      >
        <div className="p-4">
          <div className="mb-4">
            <label htmlFor="teamName" className="block text-sm font-medium mb-1 dark:text-white">
              Team Name
            </label>
            <input
              id="teamName"
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Enter team name"
              className="w-full p-2 border rounded dark:bg-dark-tertiary dark:border-gray-700 dark:text-white"
            />
          </div>
          
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2 dark:text-white">Team Access Roles:</h4>
            <div className="grid grid-cols-2 gap-2 border p-3 rounded max-h-40 overflow-y-auto dark:border-gray-700">
              {roles?.map(role => (
                <div key={role.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`modal-role-${role.id}`}
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={() => handleRoleToggle(role.id)}
                    className="h-4 w-4"
                  />
                  <label htmlFor={`modal-role-${role.id}`} className="text-sm dark:text-gray-300">
                    {role.name}
                    {role.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        ({role.description})
                      </span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setNewTeamName("");
                setSelectedRoleIds([]);
              }}
              className="px-4 py-2 border text-gray-700 rounded hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTeam}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!newTeamName}
            >
              Create Team
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Edit Team Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        name="Edit Team"
      >
        {teamToEdit && (
          <div className="p-4">
            <div className="mb-4">
              <label htmlFor="editTeamName" className="block text-sm font-medium mb-1 dark:text-white">
                Team Name
              </label>
              <input
                id="editTeamName"
                type="text"
                defaultValue={teamToEdit.teamName}
                className="w-full p-2 border rounded dark:bg-dark-tertiary dark:border-gray-700 dark:text-white"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 border text-gray-700 rounded hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditTeam(teamToEdit.id, (document.getElementById('editTeamName') as HTMLInputElement).value)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Delete Team Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        name="Delete Team"
      >
        {teamToEdit && (
          <div className="p-4">
            <p className="mb-4 dark:text-white">
              Are you sure you want to delete the team <span className="font-semibold">{teamToEdit.teamName}</span>?
              This action cannot be undone.
            </p>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border text-gray-700 rounded hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTeam(teamToEdit.id)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete Team
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Team list with roles display */}
      <div className="mt-4 grid grid-cols-1 gap-4">
        {teams?.map((team) => (
          <div key={team.id} className="bg-white p-4 rounded shadow dark:bg-dark-secondary">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-lg font-semibold dark:text-white">{team.teamName}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {team.teamRoles?.map(teamRole => (
                    <span key={teamRole.id} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full dark:bg-blue-900 dark:text-blue-100">
                      {teamRole.role.name}
                    </span>
                  ))}
                  {(!team.teamRoles || team.teamRoles.length === 0) && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">No roles assigned</span>
                  )}
                </div>
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
            
            {/* Role management for existing teams - only visible to admin users */}
            {authData?.userDetails?.team?.isAdmin && (
              <div className="mt-3 pt-3 border-t dark:border-gray-700">
                <h4 className="text-sm font-medium mb-2 dark:text-white">Manage Roles:</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {roles?.map(role => {
                    const hasRole = team.teamRoles?.some(tr => tr.role.id === role.id);
                    return (
                      <div key={role.id} className="flex items-center justify-between p-1 border rounded dark:border-gray-700">
                        <span className="text-sm dark:text-gray-300">{role.name}</span>
                        <button
                          onClick={() => hasRole
                            ? handleRemoveRole(team.id, role.id)
                            : handleAddRole(team.id, role.id)
                          }
                          className={`px-2 py-1 text-xs rounded ${
                            hasRole
                              ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-100'
                              : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100'
                          }`}
                        >
                          {hasRole ? 'Remove' : 'Add'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamsPage;
