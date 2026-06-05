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
router.get('/payments', protect, adminOnly, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('brandId', 'fullName brandName')
      .populate('creatorId', 'fullName')
      .populate('collaborationId', 'status agreedAmount')
      .sort({ createdAt: -1 })
    res.json(payments)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Verify payment
router.put('/payments/:id/verify', protect, adminOnly, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        status:     'verified',
        verifiedBy: req.user._id,
        verifiedAt: new Date(),
      },
      { new: true }
    )

    // Brand ko notification
    await Notification.create({
      userId:  payment.brandId,
      title:   'Payment Verified ✅',
      message: 'Your payment has been verified. Creator can now start work.',
      type:    'payment',
      link:    '/brand/payments',
    })

    res.json(payment)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// Release payment
router.put('/payments/:id/release', protect, adminOnly, async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        status:     'released',
        releasedAt: new Date(),
      },
      { new: true }
    ).populate('creatorId', 'fullName')

    // Collaboration payment status update
    await Collaboration.findByIdAndUpdate(
      payment.collaborationId,
      { paymentStatus: 'released' }
    )

    // Creator ko notification
    await Notification.create({
      userId:  payment.creatorId._id,
      title:   'Payment Released! 💰',
      message: `PKR ${payment.creatorAmount?.toLocaleString()} has been sent to your account.`,
      type:    'payment',
      link:    '/creator/earnings',
    })

    res.json(payment)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router