const express = require('express');
const router  = express.Router();
const { getNotifications, markAsRead, markAllRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/',              protect, getNotifications);
router.put('/:id/read',      protect, markAsRead);
router.put('/read-all',      protect, markAllRead);

module.exports = router;