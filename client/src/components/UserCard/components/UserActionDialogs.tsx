import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress
} from "@mui/material";
import { UserX, AlertTriangle, Trash2 } from "lucide-react";

interface UserActionDialogsProps {
  username: string;
  userId: number;
  // Disable dialog
  showDisableConfirm: boolean;
  isDisabling: boolean;
  onCloseDisable: () => void;
  onConfirmDisable: () => void;
  // Enable dialog
  showEnableConfirm: boolean;
  isEnabling: boolean;
  onCloseEnable: () => void;
  onConfirmEnable: () => void;
  // Hard delete dialog
  showHardDeleteConfirm: boolean;
  isHardDeleting: boolean;
  onCloseHardDelete: () => void;
  onConfirmHardDelete: () => void;
}

const UserActionDialogs: React.FC<UserActionDialogsProps> = ({
  username,
  userId,
  showDisableConfirm,
  isDisabling,
  onCloseDisable,
  onConfirmDisable,
  showEnableConfirm,
  isEnabling,
  onCloseEnable,
  onConfirmEnable,
  showHardDeleteConfirm,
  isHardDeleting,
  onCloseHardDelete,
  onConfirmHardDelete,
}) => {
  return (
    <>
      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableConfirm} onClose={onCloseDisable}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <UserX className="mr-2 text-yellow-600" /> Confirm Disable User
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to disable the user &quot;{username}&quot;?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            This user will no longer be able to log in and will be moved to a disabled users list. They can be re-enabled later.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseDisable} disabled={isDisabling}>Cancel</Button>
          <Button
            onClick={onConfirmDisable}
            color="warning"
            variant="contained"
            disabled={isDisabling}
            startIcon={isDisabling ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isDisabling ? "Disabling..." : "Disable User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enable Confirmation Dialog */}
      <Dialog open={showEnableConfirm} onClose={onCloseEnable}>
        <DialogTitle>Confirm Enable User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to enable the user &quot;{username}&quot;?
            This will re-enable their account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseEnable} disabled={isEnabling}>Cancel</Button>
          <Button
            onClick={onConfirmEnable}
            color="success"
            variant="contained"
            disabled={isEnabling}
            startIcon={isEnabling ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {isEnabling ? "Enabling..." : "Enable User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hard Delete Confirmation Dialog */}
      <Dialog open={showHardDeleteConfirm} onClose={onCloseHardDelete}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <AlertTriangle className="mr-2 text-red-600" /> Confirm Permanent Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you absolutely sure you want to permanently delete the user &quot;<strong>{username}</strong>&quot; (ID: {userId})?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            This action cannot be undone. All related data (tasks, comments, attachments etc., depending on server configuration) will be permanently removed or disassociated. The user will also be deleted from Cognito.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseHardDelete} disabled={isHardDeleting}>Cancel</Button>
          <Button
            onClick={onConfirmHardDelete}
            color="error"
            variant="contained"
            disabled={isHardDeleting}
            startIcon={isHardDeleting ? <CircularProgress size={20} color="inherit" /> : <Trash2 />}
          >
            {isHardDeleting ? "Deleting..." : "Yes, Delete Permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserActionDialogs;
