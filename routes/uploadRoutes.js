const express  = require('express')
const router   = express.Router()
const { upload } = require('../config/cloudinary')
const { protect } = require('../middleware/authMiddleware')
const cloudinary = require('cloudinary').v2

// ✅ Single image upload
router.post('/image', protect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })
    res.json({ url: req.file.path, public_id: req.file.filename })
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message })
  }
})

// ✅ Work file upload — image/video/doc
router.post('/work-file', protect, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message })
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    res.json({
      url:          req.file.path,
      public_id:    req.file.filename,
      originalName: req.file.originalname,
      type:         req.file.mimetype,
      size:         req.file.size,
    })
  })
})

module.exports = router