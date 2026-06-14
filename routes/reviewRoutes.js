const express = require('express');
const router  = express.Router();
const { createReview, getCreatorReviews, getMyReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.post('/',                    protect, createReview);
router.get('/my',                   protect, getMyReviews);
router.get('/creator/:creatorId',   getCreatorReviews);

module.exports = router;