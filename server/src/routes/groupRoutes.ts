import express from 'express';
import * as groupController from '../controllers/groupController';

const router = express.Router();

// Group management
router.get('/', groupController.getGroups);
router.post('/', groupController.createGroup);
router.put('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);
router.post('/assign', groupController.assignGroupToUser);

// Location users
router.get('/locations/:locationId/users', groupController.getLocationUsers);

export default router;