const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/authMiddleware')
const Dispute       = require('../models/Dispute')
const Collaboration = require('../models/Collaboration')
const Notification  = require('../models/Notification')
const User          = require('../models/User')

router.post('/', protect, async (req, res) => {
  try {
    const { collaborationId, reason } = req.body

    if (!collaborationId || !reason) {
      return res.status(400).json({ message: 'Collaboration and reason are required' })
    }

    const collaboration = await Collaboration.findById(collaborationId)
      .populate('opportunityId', 'title')
    if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' })

    const userId    = req.user._id.toString()
    const isBrand   = collaboration.brandId.toString() === userId
    const isCreator = collaboration.creatorId.toString() === userId

    if (!isBrand && !isCreator) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    // Already open dispute check
    const existing = await Dispute.findOne({
      collaborationId,
      status: { $in: ['open', 'reviewing'] }
    })
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

    // Collaboration status disputed
    await Collaboration.findByIdAndUpdate(collaborationId, { status: 'disputed' })

    // ✅ Admin ko full notification bhejo
    const admins = await User.find({ role: 'admin' })
    for (const admin of admins) {
      const notif = await Notification.create({
        userId:  admin._id,
        title:   '⚖️ New Dispute Filed',
        message: `${req.user.fullName} filed a dispute for "${collaboration.opportunityId?.title || 'a collaboration'}". Reason: ${reason.substring(0, 80)}`,
        type:    'system',
        link:    '/admin/disputes',
      })

      // ✅ Complete notif object emit karo
      if (global.io) {
        global.io.to(admin._id.toString()).emit('new_notification', notif)
      }
    }

    console.log('✅ Dispute filed:', dispute._id, '| Admins notified:', admins.length)
    res.status(201).json(dispute)
  } catch (err) {
    console.error('file dispute error:', err.message)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
})

module.exports = router