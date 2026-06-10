const Notification = require('../models/Notification');



const nodemailer = require('nodemailer')

const sendEmailNotification = async (userId, title, message) => {
  try {
    const User = require('../models/User')
    const user = await User.findById(userId).select('email fullName')
    if (!user) return

    const transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from:    `"Trendora" <${process.env.EMAIL_USER}>`,
      to:      user.email,
      subject: `Trendora — ${title}`,
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:500px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ede9fe;">
          <div style="background:linear-gradient(135deg,#7c3aed,#4c1d95);padding:24px;text-align:center;">
            <span style="color:#fff;font-size:20px;font-weight:900;letter-spacing:2px;">TRENDORA</span>
          </div>
          <div style="padding:24px;">
            <h2 style="color:#1f2937;font-size:18px;margin:0 0 8px;">${title}</h2>
            <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">${message}</p>
            <a href="${process.env.CLIENT_URL}"
              style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
              Open Trendora
            </a>
          </div>
          <div style="background:#f9fafb;padding:16px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} Trendora</p>
          </div>
        </div>
      `,
    })
  } catch (err) {
    console.error('Email notification error:', err.message)
  }
}
// @GET /api/notifications — User ki notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/notifications/:id/read — Mark as read
const markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/notifications/read-all — Sab read karo
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id }, { isRead: true });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getNotifications, markAsRead, markAllRead };