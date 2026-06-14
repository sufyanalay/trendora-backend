const Payment       = require('../models/Payment');
const Collaboration = require('../models/Collaboration');
const Notification  = require('../models/Notification');

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

// @GET /api/payments/brand
const getBrandPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ brandId: req.user._id })
      .populate('collaborationId', 'status agreedAmount opportunityId')
      .populate('creatorId', 'fullName email')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @GET /api/payments/creator
const getCreatorPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ creatorId: req.user._id })
      .populate('collaborationId', 'status agreedAmount')
      .populate('brandId', 'fullName brandName')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/payments/:id/upload-screenshot — Brand screenshot upload kare
const uploadScreenshot = async (req, res) => {
  try {
    const { screenshotUrl, transactionId, brandJazzCash, paymentNote } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    payment.screenshotUrl = screenshotUrl;
    payment.transactionId = transactionId;
    payment.brandJazzCash = brandJazzCash;
    payment.paymentNote   = paymentNote;
    payment.status        = 'screenshot_uploaded';
    await payment.save();

    // Admin ko notification
    const admins = await require('../models/User').find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'Payment Screenshot Uploaded 📸',
        `Brand uploaded payment proof of PKR ${payment.totalAmount}. Please verify.`,
        'payment',
        '/admin/payments'
      );
    }

    res.json({ message: 'Screenshot uploaded. Waiting for admin verification.', payment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @PUT /api/payments/:id/verify — Admin verify kare
const verifyPayment = async (req, res) => {
  try {
    // ✅ Pehle payment lo bina populate ke
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Not found' });

    payment.status     = 'verified';
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    await payment.save();

    // ✅ IDs directly lo — populate mat karo
    const brandId   = payment.brandId.toString();
    const creatorId = payment.creatorId.toString();

    // Collaboration active + chat unlock
    const collaboration = await Collaboration.findByIdAndUpdate(
      payment.collaborationId,
      {
        status:        'active',
        chatUnlocked:  true,
        paymentStatus: 'paid',
      },
      { new: true }
    );

    console.log('✅ Collaboration updated:', collaboration._id.toString());
    console.log('✅ chatUnlocked:', collaboration.chatUnlocked);
    console.log('✅ Emitting to brandId:', brandId);
    console.log('✅ Emitting to creatorId:', creatorId);

    // ✅ Socket emit
    if (global.io) {
      const updateData = {
        collaborationId: collaboration._id.toString(),
        chatUnlocked:    true,
        status:          'active',
      }
      global.io.to(brandId).emit('collaboration_updated', updateData);
      global.io.to(creatorId).emit('collaboration_updated', updateData);
      console.log('✅ Socket emitted successfully')
    } else {
      console.log('❌ global.io not found')
    }

    // Notifications
    await createNotification(
      brandId,
      'Payment Verified ✅',
      'Your payment has been verified. Chat is now unlocked!',
      'payment',
      '/brand/collaborations'
    );

    await createNotification(
      creatorId,
      'Collaboration Active! 🎉',
      'Payment verified. Chat is now unlocked. Start working!',
      'collaboration',
      '/creator/collaborations'
    );

    res.json({ message: 'Payment verified!', payment });
  } catch (err) {
    console.error('verifyPayment error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
// @PUT /api/payments/:id/release — Admin creator ko release kare
const releasePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('creatorId', 'fullName email jazzCashNumber easypaisaNumber')
      .populate('collaborationId');

    if (!payment) return res.status(404).json({ message: 'Not found' });

    // ✅ CRITICAL CHECK: Admin can only release payment if brand approved the work
    const collaboration = payment.collaborationId;
    
    if (collaboration.status !== 'completed') {
      return res.status(403).json({
        message: 'Cannot release payment - Brand has not approved the work yet',
        currentStatus: collaboration.status,
        requiredStatus: 'completed'
      });
    }

    if (collaboration.paymentStatus !== 'paid') {
      return res.status(403).json({
        message: 'Cannot release payment - Payment not marked as paid by brand',
        currentPaymentStatus: collaboration.paymentStatus,
        requiredPaymentStatus: 'paid'
      });
    }

    payment.status     = 'released';
    payment.releasedAt = new Date();
    await payment.save();

    // Collaboration update
    await Collaboration.findByIdAndUpdate(payment.collaborationId, {
      paymentStatus: 'released'
    });

    // Creator ko notification
    const creatorId = payment.creatorId._id;
    await createNotification(
      creatorId,
      'Payment Released! 💰',
      `PKR ${payment.creatorAmount?.toLocaleString()} has been sent to your account: ${payment.creatorId.jazzCashNumber || 'N/A'}`,
      'payment',
      '/creator/earnings'
    );

    // Admin ko confirmation
    const adminMessage = `Payment of PKR ${payment.creatorAmount?.toLocaleString()} released to ${payment.creatorId.fullName}`;
    console.log(`✅ ${adminMessage}`);

    res.json({ message: 'Payment released successfully!', payment });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @GET /api/payments/admin
const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('brandId', 'fullName brandName')
      .populate('creatorId', 'fullName email jazzCashNumber easypaisaNumber bankName bankAccountNumber bankAccountTitle')  // ← ye fields
      .populate({
        path: 'collaborationId',
        populate: { path: 'opportunityId', select: 'title' }
      })
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBrandPayments,
  getCreatorPayments,
  uploadScreenshot,
  verifyPayment,
  releasePayment,
  getAllPayments,
};