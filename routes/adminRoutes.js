const express = require('express')
const router  = express.Router()
const { protect, adminOnly } = require('../middleware/authMiddleware')

const User          = require('../models/User')
const Opportunity   = require('../models/Opportunity')
const Collaboration = require('../models/Collaboration')
const Payment       = require('../models/Payment')
const Notification  = require('../models/Notification')
const Dispute = require('../models/Dispute')
const Message = require('../models/Message')


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
      .populate('brandId', 'fullName brandName email')
      .populate('creatorId', 'fullName email')
      .select('opportunityId applicationId brandId creatorId agreedAmount deadline status submittedAt completedAt chatUnlocked paymentStatus createdAt')
      .lean()
      .sort({ createdAt: -1 })
    res.json(collabs)
  } catch (err) {
    console.error('admin/collaborations error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})



// Get all disputes
router.get('/disputes', protect, adminOnly, async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate('brandId', 'fullName brandName email')
      .populate('creatorId', 'fullName email')
      .populate({
        path: 'collaborationId',
        populate: { path: 'opportunityId', select: 'title' }
      })
      .sort({ createdAt: -1 })
    res.json(disputes)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})


// ✅ Admin — Delete collaboration + messages
router.delete('/collaborations/:id', protect, adminOnly, async (req, res) => {
  try {
    const collab = await Collaboration.findById(req.params.id)
    if (!collab) return res.status(404).json({ message: 'Not found' })

    // Sirf completed collaborations delete ho sakti hain
    if (collab.status !== 'completed') {
      return res.status(400).json({ message: 'Only completed collaborations can be deleted' })
    }

    // Messages delete karo
    await Message.deleteMany({ collaborationId: req.params.id })

    // Collaboration delete karo
    await Collaboration.findByIdAndDelete(req.params.id)

    res.json({ message: 'Collaboration and chat deleted successfully' })
  } catch (err) {
    console.error('delete collab error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ✅ Admin — Force complete collaboration
router.put('/collaborations/:id/complete', protect, adminOnly, async (req, res) => {
  try {
    const collab = await Collaboration.findByIdAndUpdate(
      req.params.id,
      { status: 'completed', completedAt: new Date() },
      { new: true }
    )
    res.json(collab)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ✅ Admin — Cancel collaboration
router.put('/collaborations/:id/cancel', protect, adminOnly, async (req, res) => {
  try {
    const collab = await Collaboration.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    )

    // Payment refund mark karo
    await Payment.findOneAndUpdate(
      { collaborationId: req.params.id },
      { status: 'refunded' }
    )

    // Dono ko notify karo
    await Notification.create({
      userId:  collab.brandId,
      title:   'Collaboration Cancelled',
      message: 'Admin has cancelled this collaboration.',
      type:    'system',
      link:    '/brand/collaborations',
    })
    await Notification.create({
      userId:  collab.creatorId,
      title:   'Collaboration Cancelled',
      message: 'Admin has cancelled this collaboration.',
      type:    'system',
      link:    '/creator/collaborations',
    })

    res.json(collab)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})


// Resolve dispute
router.put('/disputes/:id/resolve', protect, adminOnly, async (req, res) => {
  try {
    const { decision, resolution } = req.body
    const dispute = await Dispute.findById(req.params.id)
      .populate('brandId', 'fullName brandName')
      .populate('creatorId', 'fullName')

    if (!dispute) return res.status(404).json({ message: 'Dispute not found' })

    dispute.status     = 'resolved'
    dispute.decision   = decision
    dispute.resolution = resolution
    dispute.resolvedBy = req.user._id
    dispute.resolvedAt = new Date()
    await dispute.save()

    // Payment action based on decision
    const payment = await Payment.findOne({ collaborationId: dispute.collaborationId })
    if (payment) {
      if (decision === 'release') {
        payment.status = 'verified' // Admin release karega
        await payment.save()
        await Collaboration.findByIdAndUpdate(dispute.collaborationId, {
          status: 'completed', paymentStatus: 'paid'
        })
      } else if (decision === 'refund') {
        payment.status = 'refunded'
        await payment.save()
        await Collaboration.findByIdAndUpdate(dispute.collaborationId, {
          status: 'cancelled', paymentStatus: 'refunded'
        })
      }
    }

    // Brand notify
    await Notification.create({
      userId:  dispute.brandId._id,
      title:   'Dispute Resolved ⚖️',
      message: `Admin decision: ${decision}. ${resolution}`,
      type:    'system',
      link:    '/brand/collaborations',
    })

    // Creator notify
    await Notification.create({
      userId:  dispute.creatorId._id,
      title:   'Dispute Resolved ⚖️',
      message: `Admin decision: ${decision}. ${resolution}`,
      type:    'system',
      link:    '/creator/collaborations',
    })

    if (global.io) {
      global.io.to(dispute.brandId._id.toString()).emit('new_notification', { title: 'Dispute Resolved', type: 'system' })
      global.io.to(dispute.creatorId._id.toString()).emit('new_notification', { title: 'Dispute Resolved', type: 'system' })
    }

    res.json(dispute)
  } catch (err) {
    console.error('resolve dispute error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})









// ─── PAYMENTS ─────────────────────────────────────────

// All payments
router.get('/payments', protect, adminOnly, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('brandId', 'fullName brandName email')
      .populate('creatorId', 'fullName email jazzCashNumber easypaisaNumber bankName bankAccountNumber bankAccountTitle')
      .populate({
        path: 'collaborationId',
        populate: { path: 'opportunityId', select: 'title' }
      })
      .select('collaborationId brandId creatorId totalAmount platformCommission creatorAmount screenshotUrl transactionId status verifiedAt releasedAt createdAt')
      .lean()
      .sort({ createdAt: -1 })
    res.json(payments)
  } catch (err) {
    console.error('admin/payments error:', err.message)
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
// Fix old collaborations
router.put('/fix-collaborations', protect, adminOnly, async (req, res) => {
  try {
    const result = await Collaboration.updateMany(
      { status: { $in: ['active', 'submitted', 'completed', 'revision'] } },
      { $set: { chatUnlocked: true } }
    );
    res.json({ message: 'Fixed', updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: 'Error' });
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