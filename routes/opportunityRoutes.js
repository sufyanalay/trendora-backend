const express = require('express');
const router  = express.Router();
const { getOpportunities, createOpportunity, getOpportunityById } = require('../controllers/opportunityController');
const { protect } = require('../middleware/authMiddleware');
const Opportunity = require('../models/Opportunity');

// Public routes
router.get('/',       getOpportunities);
router.post('/',      protect, createOpportunity);

// Brand ki apni opportunities — /:id se PEHLE hona chahiye
router.get('/my/list', protect, async (req, res) => {
  try {
    const opps = await Opportunity.find({ brandId: req.user._id }).sort({ createdAt: -1 });
    res.json(opps);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Single opportunity — sabse last
router.get('/:id', getOpportunityById);

module.exports = router;