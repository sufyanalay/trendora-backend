const express    = require('express')
const router     = express.Router()
const { upload } = require('../config/cloudinary')
const { protect } = require('../middleware/authMiddleware')

router.post('/image', protect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }
    res.json({
      url:       req.file.path,
      public_id: req.file.filename,
    })
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message })
  }
})

module.exports = router