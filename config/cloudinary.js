const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // ✅ Video detect karo
    const isVideo = file.mimetype.startsWith('video/')
    const isImage = file.mimetype.startsWith('image/')

    return {
      folder:         'trendora',
      resource_type:  isVideo ? 'video' : isImage ? 'image' : 'raw',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'pdf', 'doc', 'docx'],
      // Video ke liye quality
      ...(isVideo && {
        transformation: [{ quality: 'auto' }]
      }),
    }
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
})

module.exports = { cloudinary, upload }


// const cloudinary = require('cloudinary').v2
// const { CloudinaryStorage } = require('multer-storage-cloudinary')
// const multer = require('multer')

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key:    process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// })

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder:         'trendora/payments',
//     allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
//     transformation: [{ width: 1200, quality: 'auto' }],
//   },
// })

// const upload = multer({ storage })

// module.exports = { cloudinary, upload }