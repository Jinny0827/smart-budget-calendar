import express from 'express';
import {
    createGroup,
    getMyGroups,
    getGroupById,
    updateSettings,
    refreshInviteCode,
    inviteMember,
    respondToInvite,
    joinByCode,
    approveMember,
    removeMember,
    getPendingInvites
} from '../controllers/group-controller';
import { authenticationToken } from '../middleware/auth';


const router = express.Router();

router.post('/', authenticationToken, createGroup);
router.get('/', authenticationToken, getMyGroups);
router.get('/invites', authenticationToken, getPendingInvites);       // 내 초대 목록
router.post('/join', authenticationToken, joinByCode);                // B방식 코드 입력
router.get('/:id', authenticationToken, getGroupById);
router.patch('/:id/settings', authenticationToken, updateSettings);
router.post('/:id/invite', authenticationToken, inviteMember);        // A방식 초대
router.post('/:id/respond', authenticationToken, respondToInvite);    // A방식 수락/거절
router.post('/:id/approve', authenticationToken, approveMember);      // B방식 승인/거절
router.delete('/:id/members/:userId', authenticationToken, removeMember);
router.patch('/:id/invite-code/refresh', authenticationToken, refreshInviteCode);

export default router;