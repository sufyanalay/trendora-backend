// // const express = require('express');
// // const router  = express.Router();
// // const { getOpportunities, createOpportunity, getOpportunityById } = require('../controllers/opportunityController');
// // const { protect } = require('../middleware/authMiddleware');
// // const Opportunity = require('../models/Opportunity');

// // // Public routes
// // router.get('/',       getOpportunities);
// // router.post('/',      protect, createOpportunity);

// // // Brand ki apni opportunities — /:id se PEHLE hona chahiye
// // router.get('/my/list', protect, async (req, res) => {
// //   try {
// //     const opps = await Opportunity.find({ brandId: req.user._id }).sort({ createdAt: -1 });
// //     res.json(opps);
// //   } catch (err) {
// //     res.status(500).json({ message: 'Server error' });
// //   }
// // });

// // // Single opportunity — sabse last
// // router.get('/:id', getOpportunityById);

// // module.exports = router;



// const express = require('express');
// const router  = express.Router();
// const { getOpportunities, createOpportunity, getOpportunityById } = require('../controllers/opportunityController');
// const { protect } = require('../middleware/authMiddleware');
// const Opportunity = require('../models/Opportunity');

// // Public
// router.get('/',    getOpportunities);
// router.post('/',   protect, createOpportunity);

// // Brand ki apni opportunities
// router.get('/my/list', protect, async (req, res) => {
//   try {
//     const opps = await Opportunity.find({ brandId: req.user._id }).sort({ createdAt: -1 });
//     res.json(opps);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // ✅ Brand — Edit opportunity
// router.put('/:id', protect, async (req, res) => {
//   try {
//     const opp = await Opportunity.findById(req.params.id);
//     if (!opp) return res.status(404).json({ message: 'Not found' });
//     if (opp.brandId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }
//     if (opp.status === 'closed') {
//       return res.status(400).json({ message: 'Cannot edit a closed opportunity' });
//     }

//     const { title, description, category, platform, budget, deadline } = req.body;
//     const updated = await Opportunity.findByIdAndUpdate(
//       req.params.id,
//       { title, description, category, platform, budget, deadline },
//       { new: true }
//     );
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // ✅ Brand — Close opportunity
// router.put('/:id/close', protect, async (req, res) => {
//   try {
//     const opp = await Opportunity.findById(req.params.id);
//     if (!opp) return res.status(404).json({ message: 'Not found' });
//     if (opp.brandId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }
//     const updated = await Opportunity.findByIdAndUpdate(
//       req.params.id,
//       { status: 'closed' },
//       { new: true }
//     );
//     res.json(updated);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// // Single opportunity
// router.get('/:id', getOpportunityById);

// module.exports = router;


const express = require('express');
const router  = express.Router();
const { getOpportunities, createOpportunity, getOpportunityById } = require('../controllers/opportunityController');
const { protect } = require('../middleware/authMiddleware');
const Opportunity = require('../models/Opportunity');

// Public
router.get('/',    getOpportunities);
router.post('/',   protect, createOpportunity);

// Brand ki apni opportunities
router.get('/my/list', protect, async (req, res) => {
  try {
    const opps = await Opportunity.find({ brandId: req.user._id }).sort({ createdAt: -1 });
    res.json(opps);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Brand — Edit opportunity
router.put('/:id', protect, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id);
    if (!opp) return res.status(404).json({ message: 'Not found' });
    if (opp.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (opp.status === 'closed') {
      return res.status(400).json({ message: 'Cannot edit a closed opportunity' });
    }

    const { title, description, category, platform, budget, deadline } = req.body;
    const updated = await Opportunity.findByIdAndUpdate(
      req.params.id,
      { title, description, category, platform, budget, deadline },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ Brand — Close opportunity
router.put('/:id/close', protect, async (req, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id);
    if (!opp) return res.status(404).json({ message: 'Not found' });
    if (opp.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const updated = await Opportunity.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Single opportunity
router.get('/:id', getOpportunityById);

module.exports = router;