"use client";

import {
  useGetAuthUserQuery,
  useGetTeamsQuery,
  useJoinTeamMutation,
  useCreateTeamMutation,
  useAddRoleToTeamMutation,
  useRemoveRoleFromTeamMutation,
  useDeleteTeamMutation,
  useUpdateTeamMutation
} from "@/state/api";
import Header from "@/components/Header";
import { useState } from "react";
import Modal from "@/components/Modal";
import { Settings, Trash2, Edit, Plus } from "lucide-react";

const TeamsPage = () => {
  const { data: teamsData, isLoading: isTeamsLoading } = useGetTeamsQuery();
  const { data: authData } = useGetAuthUserQuery({});
  
  // Extract teams and roles from the response
  const teams = teamsData?.teams || [];
  const availableRoles = teamsData?.availableRoles || [];
  
  // We no longer need a separate roles query as it's included in the teams response
  const isRolesLoading = false;
  const roles = availableRoles;
  const [joinTeam] = useJoinTeamMutation();
  const [createTeam] = useCreateTeamMutation();
  const [addRoleToTeam] = useAddRoleToTeamMutation();
  const [removeRoleFromTeam] = useRemoveRoleFromTeamMutation();
  const [deleteTeam] = useDeleteTeamMutation();
  const [updateTeam] = useUpdateTeamMutation();
  
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

  // Team edit and delete functions
  const handleEditTeam = async (teamId: number, newName: string) => {
    try {
      console.log("Updating team", teamId, "with new name:", newName);
      await updateTeam({ teamId, teamName: newName });
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    try {
      console.log("Deleting team", teamId);
      await deleteTeam(teamId);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting team:', error);
    }
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
              {availableRoles && availableRoles.length > 0 ? (
                availableRoles.map(role => (
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
                ))
              ) : (
                <div className="col-span-2 text-center py-2 text-gray-500">
                  Loading roles...
                </div>
              )}
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
              <div className="flex items-center gap-2">
                {/* Join button - only visible to admins or for user with username "admin" */}
                {(isUserAdmin || authData?.userDetails?.username === 'admin') ? (
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
                ) : (
                  <span className="text-sm text-gray-500 italic dark:text-gray-400">
                    {authData?.userDetails?.teamId === team.id
                      ? 'Current Team'
                      : 'Admin assignment only'}
                  </span>
                )}
                
                {/* Settings menu for admins */}
                {isUserAdmin && (
                  <div className="relative">
                    <button
                      onClick={() => openTeamSettings(team.id)}
                      className="p-2 text-gray-500 rounded-full hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-dark-tertiary"
                    >
                      <Settings size={18} />
                    </button>
                    
                    {/* Settings dropdown */}
                    {showSettingsFor === team.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 dark:bg-dark-tertiary">
                        <button
                          onClick={() => openEditModal(team)}
                          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left flex items-center gap-2 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          <Edit size={14} />
                          Rename Team
                        </button>
                        <button
                          onClick={() => openDeleteModal(team)}
                          className="px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left flex items-center gap-2 dark:text-red-400 dark:hover:bg-gray-800"
                        >
                          <Trash2 size={14} />
                          Delete Team
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Role management for existing teams - only visible to admin users */}
            {isUserAdmin && (
              <div className="mt-3 pt-3 border-t dark:border-gray-700">
                <h4 className="text-sm font-medium mb-2 dark:text-white">Manage Roles:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {availableRoles && availableRoles.length > 0 ? (
                    availableRoles.map(role => {
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
                    })
                  ) : (
                    <div className="col-span-3 text-center py-2 text-gray-500">
                      No roles available to assign
                    </div>
                  )}
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
