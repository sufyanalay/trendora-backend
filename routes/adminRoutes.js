const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { adminOnly } = require('../middleware/authMiddleware')
const User         = require('../models/User')
const Opportunity  = require('../models/Opportunity')

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

// Payments — placeholder
router.get('/payments', protect, adminOnly, async (req, res) => {
  res.json([])
})

module.exports = router