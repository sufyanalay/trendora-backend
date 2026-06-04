const Collaboration  = require('../models/Collaboration');
const Application    = require('../models/Application');
const Opportunity    = require('../models/Opportunity');
const Payment        = require('../models/Payment');
const Notification   = require('../models/Notification');

// Helper — notification banao
const createNotification = async (userId, title, message, type, link) => {
  try {
    await Notification.create({ userId, title, message, type, link });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// @POST /api/collaborations — Application accept hone par create
const createCollaboration = async (req, res) => {
  try {
    const { applicationId } = req.body;

    const application = await Application.findById(applicationId)
      .populate('opportunityId');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Sirf brand create kar sakta hai
    if (application.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Already collaboration hai?
    const existing = await Collaboration.findOne({ applicationId });
    if (existing) {
      return res.status(400).json({ message: 'Collaboration already exists' });
    }

    // Application accept karo
    application.status = 'accepted';
    await application.save();

    // Collaboration banao
    const collaboration = await Collaboration.create({
      opportunityId: application.opportunityId._id,
      applicationId: application._id,
      brandId:       application.brandId,
      creatorId:     application.creatorId,
      agreedAmount:  application.counterAmount || application.opportunityId.budget,
      deadline:      application.opportunityId.deadline,
    });

    // Payment record banao
    const totalAmount        = collaboration.agreedAmount;
    const platformCommission = Math.round(totalAmount * 0.10);
    const creatorAmount      = totalAmount - platformCommission;

    await Payment.create({
      collaborationId:    collaboration._id,
      brandId:            application.brandId,
      creatorId:          application.creatorId,
      totalAmount,
      platformCommission,
      creatorAmount,
    });

    // Notifications
    await createNotification(
      application.creatorId,
      'Collaboration Started! 🎉',
      `Your application has been accepted. Chat is now unlocked!`,
      'collaboration',
      `/creator/collaborations`
    );

    res.status(201).json(collaboration);

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @GET /api/collaborations/creator — Creator ke collaborations
const getCreatorCollaborations = async (req, res) => {
  try {
    const collaborations = await Collaboration.find({ creatorId: req.user._id })
      .populate('opportunityId', 'title platform category')
      .populate('brandId', 'fullName brandName email')
      .sort({ createdAt: -1 });

    res.json(collaborations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @GET /api/collaborations/brand — Brand ke collaborations
const getBrandCollaborations = async (req, res) => {
  try {
    const collaborations = await Collaboration.find({ brandId: req.user._id })
      .populate('opportunityId', 'title platform category')
      .populate('creatorId', 'fullName email socialPlatform')
      .sort({ createdAt: -1 });

    res.json(collaborations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @GET /api/collaborations/admin — Admin sab dekhe
const getAllCollaborations = async (req, res) => {
  try {
    const collaborations = await Collaboration.find()
      .populate('opportunityId', 'title')
      .populate('brandId', 'fullName brandName')
      .populate('creatorId', 'fullName')
      .sort({ createdAt: -1 });

    res.json(collaborations);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/collaborations/:id/submit — Creator work submit kare
const submitWork = async (req, res) => {
  try {
    const { submittedWork } = req.body;
    const collaboration = await Collaboration.findById(req.params.id);

    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration not found' });
    }
    if (collaboration.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    collaboration.status        = 'submitted';
    collaboration.submittedWork = submittedWork;
    collaboration.submittedAt   = new Date();
    await collaboration.save();

    // Brand ko notification
    await createNotification(
      collaboration.brandId,
      'Work Submitted! 📦',
      'Creator has submitted the work. Please review and approve.',
      'collaboration',
      `/brand/collaborations`
    );

    res.json(collaboration);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/collaborations/:id/approve — Brand approve kare
const approveWork = async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.id);

    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration not found' });
    }
    if (collaboration.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    collaboration.status      = 'completed';
    collaboration.completedAt = new Date();
    collaboration.paymentStatus = 'paid';
    await collaboration.save();

    // Creator ko notification
    await createNotification(
      collaboration.creatorId,
      'Work Approved! ✅',
      'Brand approved your work. Payment will be released soon.',
      'payment',
      `/creator/earnings`
    );

    res.json(collaboration);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/collaborations/:id/revision — Brand revision maange
const requestRevision = async (req, res) => {
  try {
    const { revisionNote } = req.body;
    const collaboration = await Collaboration.findById(req.params.id);

    if (!collaboration) {
      return res.status(404).json({ message: 'Not found' });
    }
    if (collaboration.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    collaboration.status       = 'revision';
    collaboration.revisionNote = revisionNote;
    await collaboration.save();

    await createNotification(
      collaboration.creatorId,
      'Revision Requested 🔄',
      `Brand requested a revision: ${revisionNote}`,
      'collaboration',
      `/creator/collaborations`
    );

    res.json(collaboration);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createCollaboration,
  getCreatorCollaborations,
  getBrandCollaborations,
  getAllCollaborations,
  submitWork,
  approveWork,
  requestRevision,
};