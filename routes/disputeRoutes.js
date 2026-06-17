const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const Dispute       = require('../models/Dispute')
const Collaboration = require('../models/Collaboration')
const Notification  = require('../models/Notification')

// File dispute
router.post('/', protect, async (req, res) => {
  try {
    const { collaborationId, reason } = req.body

    const collaboration = await Collaboration.findById(collaborationId)
    if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' })

    const userId    = req.user._id.toString()
    const isBrand   = collaboration.brandId.toString() === userId
    const isCreator = collaboration.creatorId.toString() === userId

    if (!isBrand && !isCreator) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const existing = await Dispute.findOne({ collaborationId, status: { $in: ['open', 'reviewing'] } })
    if (existing) {
      return res.status(400).json({ message: 'A dispute already exists for this collaboration' })
    }

    const dispute = await Dispute.create({
      collaborationId,
      brandId:   collaboration.brandId,
      creatorId: collaboration.creatorId,
      raisedBy:  isBrand ? 'brand' : 'creator',
      reason,
    })

    await Collaboration.findByIdAndUpdate(collaborationId, { status: 'disputed' })

    // Admin notify
    const User = require('../models/User')
    const admins = await User.find({ role: 'admin' })
    for (const admin of admins) {
      await Notification.create({
        userId:  admin._id,
        title:   '⚖️ New Dispute Filed',
        message: `A dispute has been filed. Please review and resolve.`,
        type:    'system',
        link:    '/admin/disputes',
      })
      if (global.io) {
        global.io.to(admin._id.toString()).emit('new_notification', {
          title: '⚖️ New Dispute Filed',
          type:  'system',
        })
      }
    }

    res.status(201).json(dispute)
  } catch (err) {
    console.error('file dispute error:', err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router