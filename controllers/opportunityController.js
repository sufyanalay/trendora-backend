const Opportunity = require('../models/Opportunity');

const getOpportunities = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { status: 'active' };
    if (category && category !== 'All') filter.category = category;
    const opportunities = await Opportunity.find(filter).sort({ createdAt: -1 });
    res.json(opportunities);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createOpportunity = async (req, res) => {
  try {
    const { title, description, category, budget, deadline, platform } = req.body;
    const opportunity = await Opportunity.create({
      brandId:   req.user._id,
      brandName: req.user.brandName || req.user.fullName,
      title, description, category, budget, deadline, platform
    });
    res.status(201).json(opportunity);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getOpportunityById = async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ message: 'Not found' });
    res.json(opportunity);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getOpportunities, createOpportunity, getOpportunityById };