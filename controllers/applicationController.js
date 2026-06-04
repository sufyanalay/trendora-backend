const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');

// @POST /api/applications — Creator applies
const applyToOpportunity = async (req, res) => {
  try {
    const { opportunityId, offerType, counterAmount, note } = req.body;

    // Check opportunity exists
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    if (opportunity.status !== 'active') {
      return res.status(400).json({ message: 'This opportunity is no longer active' });
    }

    // Check already applied
    const existing = await Application.findOne({
      opportunityId,
      creatorId: req.user._id,
    });
    if (existing) {
      return res.status(400).json({ message: 'You have already applied to this opportunity' });
    }

    const application = await Application.create({
      opportunityId,
      creatorId:     req.user._id,
      brandId:       opportunity.brandId,
      offerType,
      counterAmount: offerType === 'counter' ? counterAmount : opportunity.budget,
      note,
    });

    res.status(201).json(application);

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @GET /api/applications/my — Creator ke apne applications
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ creatorId: req.user._id })
      .populate('opportunityId', 'title budget platform category deadline brandName')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @GET /api/applications/brand — Brand ke received applications
const getBrandApplications = async (req, res) => {
  try {
    const applications = await Application.find({ brandId: req.user._id })
      .populate('opportunityId', 'title budget platform category')
      .populate('creatorId', 'fullName email socialPlatform socialProfileUrl')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/applications/:id/respond — Brand responds (accept/reject/counter)
const respondToApplication = async (req, res) => {
  try {
    const { action, counterAmount, note } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Only brand can respond
    if (application.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (action === 'accept') {
      application.status = 'accepted';
    } else if (action === 'reject') {
      application.status = 'rejected';
    } else if (action === 'counter') {
      application.status          = 'countered';
      application.lastCounterBy     = 'brand';
      application.lastCounterAmount = counterAmount;
      application.lastCounterNote   = note;
    }

    await application.save();
    res.json(application);

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/applications/:id/creator-respond — Creator responds to counter
const creatorRespond = async (req, res) => {
  try {
    const { action, counterAmount, note } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (action === 'accept') {
      application.status = 'accepted';
    } else if (action === 'reject') {
      application.status = 'rejected';
    } else if (action === 'counter') {
      application.status            = 'countered';
      application.lastCounterBy     = 'creator';
      application.lastCounterAmount = counterAmount;
      application.lastCounterNote   = note;
    }

    await application.save();
    res.json(application);

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @DELETE /api/applications/:id — Creator withdraws
const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    if (application.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (application.status === 'accepted') {
      return res.status(400).json({ message: 'Cannot withdraw accepted application' });
    }

    application.status = 'withdrawn';
    await application.save();
    res.json({ message: 'Application withdrawn' });

  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  applyToOpportunity,
  getMyApplications,
  getBrandApplications,
  respondToApplication,
  creatorRespond,
  withdrawApplication,
};