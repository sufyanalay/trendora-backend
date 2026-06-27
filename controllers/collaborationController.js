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
// const getCreatorCollaborations = async (req, res) => {
//   try {
//     const collaborations = await Collaboration.find({ creatorId: req.user._id })
//       .populate('opportunityId', 'title platform category budget deadline')
//       .populate('brandId', 'fullName brandName email profileImage')
//       .select('opportunityId applicationId brandId creatorId agreedAmount deadline status submittedWork submittedAt completedAt chatUnlocked paymentStatus createdAt updatedAt')
//       .lean()
//       .sort({ createdAt: -1 });
//     res.json(collaborations);
//   } catch (err) {
//     console.error('getCreatorCollaborations error:', err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // @GET /api/collaborations/brand
// const getBrandCollaborations = async (req, res) => {
//   try {
//     const collaborations = await Collaboration.find({ brandId: req.user._id })
//       .populate('opportunityId', 'title platform category budget deadline')
//       .populate('creatorId', 'fullName email socialPlatform profileImage')
//       .select('opportunityId applicationId brandId creatorId agreedAmount deadline status submittedWork submittedAt completedAt chatUnlocked paymentStatus createdAt updatedAt')
//       .lean()
//       .sort({ createdAt: -1 });
//     res.json(collaborations);
//   } catch (err) {
//     console.error('getBrandCollaborations error:', err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// @GET /api/collaborations/creator
const getCreatorCollaborations = async (req, res) => {
  try {
    const collaborations = await Collaboration.find({ creatorId: req.user._id })
      .populate('opportunityId', 'title platform category budget deadline')
      .populate('brandId', 'fullName brandName email profileImage')
      .select('opportunityId applicationId brandId creatorId agreedAmount deadline status submittedWork submittedFiles submittedAt completedAt chatUnlocked paymentStatus revisionNote createdAt updatedAt')
      .lean()
      .sort({ createdAt: -1 });
    res.json(collaborations);
  } catch (err) {
    console.error('getCreatorCollaborations error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @GET /api/collaborations/brand
const getBrandCollaborations = async (req, res) => {
  try {
    const collaborations = await Collaboration.find({ brandId: req.user._id })
      .populate('opportunityId', 'title platform category budget deadline')
      .populate('creatorId', 'fullName email socialPlatform profileImage')
      .select('opportunityId applicationId brandId creatorId agreedAmount deadline status submittedWork submittedFiles submittedAt completedAt chatUnlocked paymentStatus revisionNote createdAt updatedAt')
      .lean()
      .sort({ createdAt: -1 });
    res.json(collaborations);
  } catch (err) {
    console.error('getBrandCollaborations error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
// @GET /api/collaborations/admin
const getAllCollaborations = async (req, res) => {
  try {
    const collaborations = await Collaboration.find()
      .populate('opportunityId', 'title platform')
      .populate('brandId', 'fullName brandName email')
      .populate('creatorId', 'fullName email')
      .select('opportunityId applicationId brandId creatorId agreedAmount deadline status submittedAt completedAt chatUnlocked paymentStatus createdAt')
      .lean()
      .sort({ createdAt: -1 });
    res.json(collaborations);
  } catch (err) {
    console.error('getAllCollaborations error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/collaborations/:id/submit — Creator work submit
// const submitWork = async (req, res) => {
//   try {
//     const { submittedWork } = req.body;
//     const collaboration = await Collaboration.findById(req.params.id);

//     if (!collaboration) {
//       return res.status(404).json({ message: 'Collaboration not found' });
//     }
//     if (collaboration.creatorId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }

//     // ✅ Sirf status check — chatUnlocked check hata diya
//     if (!['active', 'revision'].includes(collaboration.status)) {
//       return res.status(400).json({
//         message: `Cannot submit. Status is: ${collaboration.status}`
//       });
//     }

//     collaboration.status        = 'submitted';
//     collaboration.submittedWork = submittedWork;
//     collaboration.submittedAt   = new Date();
//     await collaboration.save();

//     await createNotification(
//       collaboration.brandId,
//       'Work Submitted! 📦',
//       'Creator has submitted the work. Please review and approve or request revision.',
//       'collaboration',
//       '/brand/collaborations'
//     );

//     res.json(collaboration);
//   } catch (err) {
//     console.error('submitWork error:', err.message);
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };



const submitWork = async (req, res) => {
  try {
    const { submittedWork, submittedFiles } = req.body
    const collaboration = await Collaboration.findById(req.params.id)

    if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' })
    if (collaboration.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    if (!['active', 'revision'].includes(collaboration.status)) {
      return res.status(400).json({ message: `Cannot submit. Status is: ${collaboration.status}` })
    }

    // ✅ Text link ya files — koi bhi ek hona chahiye
    if (!submittedWork?.trim() && (!submittedFiles || submittedFiles.length === 0)) {
      return res.status(400).json({ message: 'Please provide work link or upload files' })
    }

    collaboration.status         = 'submitted'
    collaboration.submittedWork  = submittedWork || ''
    collaboration.submittedFiles = submittedFiles || []
    collaboration.submittedAt    = new Date()
    await collaboration.save()

    await createNotification(
      collaboration.brandId,
      'Work Submitted! 📦',
      'Creator has submitted the work. Please review and approve or request revision.',
      'collaboration',
      '/brand/collaborations'
    )

    res.json(collaboration)
  } catch (err) {
    console.error('submitWork error:', err.message)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}
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
        message: `Cannot approve. Status is: ${collaboration.status}`,
        info: 'Please wait for creator to submit work'
      });
    }

    // ✅ Verify payment was verified before approving work
    if (collaboration.paymentStatus !== 'paid' || !collaboration.chatUnlocked) {
      return res.status(403).json({
        message: 'Cannot approve work - Payment must be verified and chat unlocked first',
        paymentStatus: collaboration.paymentStatus,
        chatUnlocked: collaboration.chatUnlocked
      });
    }

    // ✅ Brand approves: Set status to completed and paymentStatus to paid
    collaboration.status        = 'completed';
    collaboration.completedAt   = new Date();
    collaboration.paymentStatus = 'paid';
    await collaboration.save();

    // ✅ Update Payment record status to verified (for admin reference)
    await Payment.findOneAndUpdate(
      { collaborationId: collaboration._id },
      { status: 'verified' }
    );

    // Creator notify - Payment is ready to be released
    await createNotification(
      collaboration.creatorId,
      'Work Approved! ✅',
      'Brand approved your work. Admin will now release your payment.',
      'payment',
      '/creator/earnings'
    );

    // Admin notify - Ready to release payment
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        '💰 Release Payment Ready',
        'Brand approved the work. You can now release payment to creator.',
        'payment',
        '/admin/payments'
      );
    }

    // Socket emit to creator
    if (global.io) {
      global.io.to(collaboration.creatorId.toString()).emit('collaboration_updated', {
        collaborationId: collaboration._id.toString(),
        status:          'completed',
        paymentReady:    true,
      });
    }

    res.json({
      message: 'Work approved! Admin can now release payment.',
      collaboration
    });
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

// @DELETE /api/collaborations/:id — Cancel collaboration
const deleteCollaboration = async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.id);

    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration not found' });
    }

    // ✅ Only creator or brand can delete
    const isCreator = collaboration.creatorId.toString() === req.user._id.toString();
    const isBrand = collaboration.brandId.toString() === req.user._id.toString();

    if (!isCreator && !isBrand) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // ✅ Cannot delete if work is submitted (mid-work)
    if (collaboration.status === 'submitted') {
      return res.status(400).json({
        message: `Cannot delete - work is under review`
      });
    }

    const otherUserId = isCreator ? collaboration.brandId : collaboration.creatorId;

    // ✅ Mark as cancelled
    collaboration.status = 'cancelled';
    await collaboration.save();

    // Notify other user
    const userRole = isCreator ? 'Creator' : 'Brand';
    await createNotification(
      otherUserId,
      'Collaboration Cancelled ❌',
      `${userRole} has cancelled the collaboration.`,
      'collaboration',
      isCreator ? '/brand/collaborations' : '/creator/collaborations'
    );

    res.json({ message: 'Collaboration cancelled', collaboration });
  } catch (err) {
    console.error('deleteCollaboration error:', err.message);
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
  deleteCollaboration,
};