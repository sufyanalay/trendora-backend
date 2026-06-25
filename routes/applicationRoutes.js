const express = require('express')
const router  = express.Router()
const {
  applyToOpportunity,
  getMyApplications,
  getBrandApplications,
  respondToApplication,
  creatorRespond,
  editApplication,
  withdrawApplication,
} = require('../controllers/applicationController')
const { protect } = require('../middleware/authMiddleware')

router.post('/',                          protect, applyToOpportunity)
router.get('/my',                         protect, getMyApplications)
router.get('/brand',                      protect, getBrandApplications)
router.put('/:id',                        protect, editApplication)       // ← Edit
router.put('/:id/respond',                protect, respondToApplication)
router.put('/:id/creator-respond',        protect, creatorRespond)
router.delete('/:id',                     protect, withdrawApplication)

module.exports = router


// const express = require('express');
// const router  = express.Router();
// const {
//   applyToOpportunity,
//   getMyApplications,
//   getBrandApplications,
//   respondToApplication,
//   creatorRespond,
//   withdrawApplication,
// } = require('../controllers/applicationController');
// const { protect } = require('../middleware/authMiddleware');

// router.post('/',                          protect, applyToOpportunity);
// router.get('/my',                         protect, getMyApplications);
// router.get('/brand',                      protect, getBrandApplications);
// router.put('/:id/respond',                protect, respondToApplication);
// router.put('/:id/creator-respond',        protect, creatorRespond);
// router.delete('/:id',                     protect, withdrawApplication);

// module.exports = router;