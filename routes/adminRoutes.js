const express = require('express')
const router  = express.Router()
const { protect, adminOnly } = require('../middleware/authMiddleware')

const User          = require('../models/User')
const Opportunity   = require('../models/Opportunity')
const Collaboration = require('../models/Collaboration')
const Payment       = require('../models/Payment')
const Notification  = require('../models/Notification')

// ─── USERS ───────────────────────────────────────────

// All users
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Ban/unban user
router.put('/users/:id/ban', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: req.body.isBanned },
      { new: true }
    ).select('-password')
    res.json(user)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── OPPORTUNITIES ────────────────────────────────────

// All opportunities
router.get('/opportunities', protect, adminOnly, async (req, res) => {
  try {
    const opps = await Opportunity.find().sort({ createdAt: -1 })
    res.json(opps)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Close opportunity
router.put('/opportunities/:id/close', protect, adminOnly, async (req, res) => {
  try {
    const opp = await Opportunity.findByIdAndUpdate(
      req.params.id,
      { status: 'closed' },
      { new: true }
    )
    res.json(opp)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── COLLABORATIONS ───────────────────────────────────

// All collaborations
router.get('/collaborations', protect, adminOnly, async (req, res) => {
  try {
    const collabs = await Collaboration.find()
      .populate('opportunityId', 'title platform')
      .populate('brandId', 'fullName brandName')
      .populate('creatorId', 'fullName')
      .sort({ createdAt: -1 })
    res.json(collabs)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── PAYMENTS ─────────────────────────────────────────

// All payments
// All payments
router.get('/payments', protect, adminOnly, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('brandId', 'fullName brandName')
      .populate('creatorId', 'fullName email jazzCashNumber easypaisaNumber bankName bankAccountNumber bankAccountTitle')  // ← ye fields add karo
      .populate({
        path: 'collaborationId',
        populate: { path: 'opportunityId', select: 'title' }
      })
      .sort({ createdAt: -1 })
    res.json(payments)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})
// Verify payment
router.put('/payments/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Not found' });

    const brandId   = payment.brandId.toString();
    const creatorId = payment.creatorId.toString();

    payment.status     = 'verified';
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    await payment.save();

    const collaboration = await Collaboration.findByIdAndUpdate(
      payment.collaborationId,
      { status: 'active', chatUnlocked: true, paymentStatus: 'paid' },
      { new: true }
    );

    console.log('✅ chatUnlocked:', collaboration.chatUnlocked);

    if (global.io) {
      const updateData = {
        collaborationId: collaboration._id.toString(),
        chatUnlocked:    true,
        status:          'active',
      }
      global.io.to(brandId).emit('collaboration_updated', updateData);
      global.io.to(creatorId).emit('collaboration_updated', updateData);
      console.log('✅ Emitted to:', brandId, creatorId);
    }

    await Notification.create({
      userId:  brandId,
      title:   'Payment Verified ✅',
      message: 'Your payment verified. Chat unlocked!',
      type:    'payment',
      link:    '/brand/collaborations',
    });

    await Notification.create({
      userId:  creatorId,
      title:   'Collaboration Active! 🎉',
      message: 'Payment verified. Chat is now unlocked!',
      type:    'collaboration',
      link:    '/creator/collaborations',
    });

    res.json(payment);
  } catch (err) {
    console.error('verify error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Release payment
router.put('/payments/:id/release', protect, adminOnly, async (req, res) => {
  try {
    const { releaseNote, releaseRef } = req.body;

    const payment = await Payment.findById(req.params.id)
      .populate('creatorId', 'fullName jazzCashNumber easypaisaNumber bankName bankAccountNumber bankAccountTitle');

    if (!payment) return res.status(404).json({ message: 'Not found' });

    payment.status     = 'released';
    payment.releasedAt = new Date();
    await payment.save();

    await Collaboration.findByIdAndUpdate(payment.collaborationId, {
      paymentStatus: 'released'
    });

    // ✅ Creator ko notification — with admin reference
    const paymentDetails = [
      payment.creatorId?.jazzCashNumber ? `JazzCash: ${payment.creatorId.jazzCashNumber}` : null,
      payment.creatorId?.easypaisaNumber ? `Easypaisa: ${payment.creatorId.easypaisaNumber}` : null,
    ].filter(Boolean).join(' | ');

    await Notification.create({
      userId:  payment.creatorId._id,
      title:   '💰 Payment Released!',
      message: `PKR ${payment.creatorAmount?.toLocaleString()} sent to your account. Ref: ${releaseRef}. ${releaseNote || ''}`,
      type:    'payment',
      link:    '/creator/earnings',
    });

    if (global.io) {
      global.io.to(payment.creatorId._id.toString()).emit('new_notification', {
        title:   '💰 Payment Released!',
        message: `PKR ${payment.creatorAmount?.toLocaleString()} sent. Ref: ${releaseRef}`,
        type:    'payment',
      });
    }

    res.json({ message: 'Payment released!', payment });
  } catch (err) {
    console.error('release error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router