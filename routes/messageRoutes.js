const express = require('express')
const router  = express.Router()
const { getMessages, sendMessage, joinCollaborationRoom } = require('../controllers/messageController')
const { protect } = require('../middleware/authMiddleware')

router.get('/:collaborationId',       protect, getMessages)
router.post('/:collaborationId',      protect, sendMessage)
router.post('/:collaborationId/join', protect, joinCollaborationRoom) 

module.exports = router