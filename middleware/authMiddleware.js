const jwt  = require('jsonwebtoken')
const User = require('../models/User')

const protect = async (req, res, next) => {
  try {
    let token
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]
    }
    if (!token) return res.status(401).json({ message: 'Not authorized' })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user    = await User.findById(decoded.id).select('-password')

    if (!user) return res.status(401).json({ message: 'User not found' })

    // ✅ Banned user check
    if (user.isBanned) {
      return res.status(403).json({
        message: 'Your account has been banned. Please contact support.',
        isBanned: true,
      })
    }

    req.user = user
    next()
  } catch (err) {
    res.status(401).json({ message: 'Not authorized' })
  }
}

const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next()
  res.status(403).json({ message: 'Admin access only' })
}

module.exports = { protect, adminOnly }