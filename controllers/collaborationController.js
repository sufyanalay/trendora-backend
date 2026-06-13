const Collaboration  = require('../models/Collaboration');
const Application    = require('../models/Application');
const Opportunity    = require('../models/Opportunity');
const Payment        = require('../models/Payment');
const Notification   = require('../models/Notification');

const createNotification = async (userId, title, message, type, link) => {
  try {
    const notif = await Notification.create({ userId, title, message, type, link });
    if (global.io) {
      global.io.to(userId.toString()).emit('new_notification', notif);
    }
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// @POST /api/collaborations
const createCollaboration = async (req, res) => {
  try {
    const { applicationId } = req.body;

    const application = await Application.findById(applicationId)
      .populate('opportunityId');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    if (application.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const existing = await Collaboration.findOne({ applicationId });
    if (existing) {
      return res.status(400).json({ message: 'Collaboration already exists' });
    }

    application.status = 'accepted';
    await application.save();

    const collaboration = await Collaboration.create({
      opportunityId: application.opportunityId._id,
      applicationId: application._id,
      brandId:       application.brandId,
      creatorId:     application.creatorId,
      agreedAmount:  application.counterAmount || application.opportunityId.budget,
      deadline:      application.opportunityId.deadline,
      status:        'payment_pending',
      chatUnlocked:  false,
      paymentStatus: 'pending',
    });

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

    await Opportunity.findByIdAndUpdate(
      application.opportunityId._id,
      { status: 'closed' }
    );

    await Application.updateMany(
      {
        opportunityId: application.opportunityId._id,
        _id:           { $ne: applicationId },
        status:        { $in: ['pending', 'countered'] }
      },
      { status: 'rejected' }
    );

    const rejectedApps = await Application.find({
      opportunityId: application.opportunityId._id,
      _id:           { $ne: applicationId },
    });
    for (const app of rejectedApps) {
      await createNotification(
        app.creatorId,
        'Application Update',
        `The opportunity has been filled by another creator.`,
        'application',
        '/creator/applications'
      );
    }

    await createNotification(
      application.brandId,
      'Payment Required! 💳',
      `Please complete payment of PKR ${totalAmount} to start collaboration.`,
      'payment',
      '/brand/payments'
    );

    res.status(201).json(collaboration);
  } catch (err) {
    console.error('createCollaboration error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @GET /api/collaborations/creator
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

// @GET /api/collaborations/brand
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

// @GET /api/collaborations/admin
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

// @PUT /api/collaborations/:id/submit — Creator work submit
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

    // ✅ Sirf status check — chatUnlocked check hata diya
    if (!['active', 'revision'].includes(collaboration.status)) {
      return res.status(400).json({
        message: `Cannot submit. Status is: ${collaboration.status}`
      });
    }

    collaboration.status        = 'submitted';
    collaboration.submittedWork = submittedWork;
    collaboration.submittedAt   = new Date();
    await collaboration.save();

    await createNotification(
      collaboration.brandId,
      'Work Submitted! 📦',
      'Creator has submitted the work. Please review and approve or request revision.',
      'collaboration',
      '/brand/collaborations'
    );

    res.json(collaboration);
  } catch (err) {
    console.error('submitWork error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @PUT /api/collaborations/:id/approve — Brand approve
const approveWork = async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.id);

    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration not found' });
    }

    // ✅ brandId string comparison
    const collabBrandId = collaboration.brandId.toString();
    const reqUserId     = req.user._id.toString();

    if (collabBrandId !== reqUserId) {
      return res.status(403).json({
        message: 'Not authorized',
        debug: { collabBrandId, reqUserId }
      });
    }

    if (collaboration.status !== 'submitted') {
      return res.status(400).json({
        message: `Cannot approve. Status is: ${collaboration.status}`
      });
    }

    // ✅ paymentStatus enum mein 'paid' add ho gaya
    collaboration.status        = 'completed';
    collaboration.completedAt   = new Date();
    collaboration.paymentStatus = 'paid';
    await collaboration.save();

    // ✅ Payment record bhi update karo
    await Payment.findOneAndUpdate(
      { collaborationId: collaboration._id },
      { status: 'verified' }
    );

    // Creator notify
    await createNotification(
      collaboration.creatorId,
      'Work Approved! ✅',
      'Brand approved your work. Admin will release your payment soon.',
      'payment',
      '/creator/earnings'
    );

    // Admin notify
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        '💰 Release Payment Now',
        'Brand approved the work. Please release payment to creator.',
        'payment',
        '/admin/payments'
      );
    }

    // Socket emit creator ko
    if (global.io) {
      global.io.to(collaboration.creatorId.toString()).emit('collaboration_updated', {
        collaborationId: collaboration._id.toString(),
        status:          'completed',
        chatUnlocked:    true,
      });
    }

    res.json(collaboration);
  } catch (err) {
    console.error('approveWork error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @PUT /api/collaborations/:id/revision — Brand revision
const requestRevision = async (req, res) => {
  try {
    const { revisionNote } = req.body;
    const collaboration = await Collaboration.findById(req.params.id);

    if (!collaboration) {
      return res.status(404).json({ message: 'Not found' });
    }

    const collabBrandId = collaboration.brandId.toString();
    const reqUserId     = req.user._id.toString();

    if (collabBrandId !== reqUserId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (collaboration.status !== 'submitted') {
      return res.status(400).json({
        message: `Cannot request revision. Status is: ${collaboration.status}`
      });
    }

    collaboration.status       = 'revision';
    collaboration.revisionNote = revisionNote;
    await collaboration.save();

    await createNotification(
      collaboration.creatorId,
      'Revision Requested 🔄',
      `Brand requested changes: ${revisionNote}`,
      'collaboration',
      '/creator/collaborations'
    );

    res.json(collaboration);
  } catch (err) {
    console.error('requestRevision error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
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