import express from 'express';
import passport from '../config/passport.js';
import * as memberController from '../controllers/memberController.js';

const router = express.Router();

router.get('/', passport.authenticate('jwt', { session: false }), memberController.getMembers);
router.get(
  '/dues/deposit-status',
  passport.authenticate('jwt', { session: false }),
  memberController.getMemberDuesDepositStatus,
);
router.get(
  '/meeting/attendance-status',
  passport.authenticate('jwt', { session: false }),
  memberController.getMemberMeetingAttendanceStatus,
);
router.patch(
  '/:memberId/meeting/attendance/:meetingYear/:meetingPeriod',
  passport.authenticate('jwt', { session: false }),
  memberController.updateMemberMeetingAttendanceStatus,
);
router.delete(
  '/:memberId/meeting/attendance/:meetingYear/:meetingPeriod',
  passport.authenticate('jwt', { session: false }),
  memberController.clearMemberMeetingAttendanceStatus,
);
router.post('/', passport.authenticate('jwt', { session: false }), memberController.createMember);
router.put('/:memberId', passport.authenticate('jwt', { session: false }), memberController.updateMember);
router.delete('/:memberId', passport.authenticate('jwt', { session: false }), memberController.deleteMember);

export default router;
