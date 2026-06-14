const express = require('express');
const router  = express.Router();
const {
  createCollaboration,
  getCreatorCollaborations,
  getBrandCollaborations,
  getAllCollaborations,
  submitWork,
  approveWork,
  requestRevision,
  deleteCollaboration,
} = require('../controllers/collaborationController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/authMiddleware');

router.post('/',               protect, createCollaboration);
router.get('/creator',         protect, getCreatorCollaborations);
router.get('/brand',           protect, getBrandCollaborations);
router.get('/admin',           protect, adminOnly, getAllCollaborations);
router.put('/:id/submit',      protect, submitWork);
router.put('/:id/approve',     protect, approveWork);
router.put('/:id/revision',    protect, requestRevision);
router.delete('/:id',          protect, deleteCollaboration);

module.exports = router;