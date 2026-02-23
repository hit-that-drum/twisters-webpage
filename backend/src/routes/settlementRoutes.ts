import express from 'express';
import passport from '../config/passport.js';
import * as settlementController from '../controllers/settlementController.js';

const router = express.Router();

router.get('/', passport.authenticate('jwt', { session: false }), settlementController.getSettlements);
router.post('/', passport.authenticate('jwt', { session: false }), settlementController.createSettlement);
router.put('/:id', passport.authenticate('jwt', { session: false }), settlementController.updateSettlement);
router.delete('/:id', passport.authenticate('jwt', { session: false }), settlementController.deleteSettlement);

export default router;
