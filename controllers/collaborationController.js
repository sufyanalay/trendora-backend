const Collaboration  = require('../models/Collaboration');
const Application    = require('../models/Application');
const Opportunity    = require('../models/Opportunity');
const Payment        = require('../models/Payment');
const Notification   = require('../models/Notification');

// collaborationController.js aur paymentController.js mein
const createNotification = async (userId, title, message, type, link) => {
  try {
    const notif = await Notification.create({ userId, title, message, type, link });

    // Socket emit
    if (global.io) {
      global.io.to(userId.toString()).emit('new_notification', notif);
    }

    if (['payment', 'collaboration'].includes(type)) {
      await sendEmailNotification(userId, title, message)
    }
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// @POST /api/collaborations — Brand accept kare
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

    // Application accept
    application.status = 'accepted';
    await application.save();

    // Collaboration banao — status: payment_pending
    const collaboration = await Collaboration.create({
      opportunityId: application.opportunityId._id,
      applicationId: application._id,
      brandId:       application.brandId,
      creatorId:     application.creatorId,
      agreedAmount:  application.counterAmount || application.opportunityId.budget,
      deadline:      application.opportunityId.deadline,
      status:        'payment_pending',
      chatUnlocked:  false,
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

    // Opportunity close
    await Opportunity.findByIdAndUpdate(
      application.opportunityId._id,
      { status: 'closed' }
    );

    // Baaki applications reject
    await Application.updateMany(
      {
        opportunityId: application.opportunityId._id,
        _id:           { $ne: applicationId },
        status:        { $in: ['pending', 'countered'] }
      },
      { status: 'rejected' }
    );

    // Rejected creators ko notification
    const rejectedApps = await Application.find({
      opportunityId: application.opportunityId._id,
      _id:           { $ne: applicationId },
    });
    for (const app of rejectedApps) {
      await createNotification(
        app.creatorId,
        'Application Update',
        `The opportunity "${application.opportunityId.title}" has been filled.`,
        'application',
        '/creator/applications'
      );
    }

    // Brand ko payment reminder
    await createNotification(
      application.brandId,
      'Payment Required! 💳',
      `Please complete payment of PKR ${totalAmount} to start collaboration.`,
      'payment',
      '/brand/payments'
    );

    res.status(201).json(collaboration);

  } catch (err) {
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

    if (!collaboration) return res.status(404).json({ message: 'Not found' });
    if (collaboration.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // ✅ Status check karo — chatUnlocked remove karo
    if (!['active', 'revision'].includes(collaboration.status)) {
      return res.status(400).json({ 
        message: `Cannot submit. Current status: ${collaboration.status}` 
      });
    }

    collaboration.status        = 'submitted';
    collaboration.submittedWork = submittedWork;
    collaboration.submittedAt   = new Date();
    await collaboration.save();

    await createNotification(
      collaboration.brandId,
      'Work Submitted! 📦',
      'Creator has submitted the work. Please review and approve.',
      'collaboration',
      '/brand/collaborations'
    );

    res.json(collaboration);
  } catch (err) {
    console.error('submitWork error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @PUT /api/collaborations/:id/approve — Brand approve
const approveWork = async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.id)
      .populate('brandId', '_id email fullName')

    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration not found' });
    }

    console.log('=== APPROVE DEBUG ===')
    console.log('req.user._id:', req.user._id.toString())
    console.log('req.user.role:', req.user.role)
    console.log('collaboration.brandId:', collaboration.brandId)
    console.log('collaboration.status:', collaboration.status)

    // ✅ brandId object hai agar populate kiya — _id se compare karo
    const brandId = collaboration.brandId._id
      ? collaboration.brandId._id.toString()
      : collaboration.brandId.toString()

    if (brandId !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'Not authorized — you are not the brand',
        debug: {
          yourId:  req.user._id.toString(),
          brandId: brandId,
        }
      });
    }

    if (collaboration.status !== 'submitted') {
      return res.status(400).json({
        message: `Cannot approve. Current status: ${collaboration.status}`
      });
    }

    collaboration.status        = 'completed';
    collaboration.completedAt   = new Date();
    collaboration.paymentStatus = 'paid';
    await collaboration.save();

    await Payment.findOneAndUpdate(
      { collaborationId: collaboration._id },
      { status: 'verified' }
    );

    await createNotification(
      collaboration.creatorId,
      'Work Approved! ✅',
      'Brand approved your work. Admin will release your payment soon.',
      'payment',
      '/creator/earnings'
    );

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
// @PUT /api/collaborations/:id/revision — Brand revision maange
const requestRevision = async (req, res) => {
  try {
    const { revisionNote } = req.body;
    const collaboration = await Collaboration.findById(req.params.id);
    if (!collaboration) return res.status(404).json({ message: 'Not found' });
    if (collaboration.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
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