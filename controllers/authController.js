const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// @POST /api/auth/register
const register = async (req, res) => {
  try {
    const {
      fullName, email, password, role,
      socialPlatform, socialProfileUrl, address,
      brandName, websiteUrl, brandAddress,
    } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName, email,
      password: hashedPassword,
      role,
      socialPlatform, socialProfileUrl, address,
      brandName, websiteUrl, brandAddress,
    });

    res.status(201).json({
      _id:      user._id,
      fullName: user.fullName,
      email:    user.email,
      role:     user.role,
      token:    generateToken(user._id),
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id:      user._id,
      fullName: user.fullName,
      email:    user.email,
      role:     user.role,
      token:    generateToken(user._id),
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const {
      fullName, socialPlatform, socialProfileUrl,
      address, brandName, websiteUrl, brandAddress,
      jazzCashNumber, easypaisaNumber,
      bankName, bankAccountNumber, bankAccountTitle,
    } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        fullName, socialPlatform, socialProfileUrl,
        address, brandName, websiteUrl, brandAddress,
        jazzCashNumber, easypaisaNumber,
        bankName, bankAccountNumber, bankAccountTitle,
      },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
// @PUT /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};


// @POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    // Generate random strong password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    let newPassword = '';
    for (let i = 0; i < 10; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Hash and save
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Send email
    const transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST,
      port:   process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from:    `"Trendora" <${process.env.EMAIL_USER}>`,
      to:      user.email,
      subject: 'Trendora — Your New Password',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ede9fe;">
          <div style="background:linear-gradient(135deg,#7c3aed,#4c1d95);padding:32px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 20px;">
              <span style="color:#ffffff;font-size:22px;font-weight:900;letter-spacing:2px;">TRENDORA</span>
            </div>
            <p style="color:#ede9fe;font-size:13px;margin:10px 0 0;">Create. Connect. Grow.</p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#1f2937;font-size:20px;font-weight:800;margin:0 0 8px;">Password Reset Request</h2>
            <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Hi <strong style="color:#1f2937;">${user.fullName}</strong>,<br/>
              We received a password reset request for your Trendora account. Here is your new temporary password:
            </p>
            <div style="background:#f5f3ff;border:2px dashed #7c3aed;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
              <p style="color:#6b7280;font-size:12px;margin:0 0 8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Your New Password</p>
              <p style="color:#7c3aed;font-size:28px;font-weight:900;letter-spacing:4px;margin:0;font-family:monospace;">${newPassword}</p>
            </div>
            <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:0 0 24px;">
              <p style="color:#1f2937;font-size:13px;font-weight:700;margin:0 0 10px;">Next Steps:</p>
              <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">1. Login with this new password</p>
              <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">2. Go to Profile Settings</p>
              <p style="color:#6b7280;font-size:13px;margin:0;">3. Change to your own password immediately</p>
            </div>
            <div style="text-align:center;margin:0 0 24px;">
              <a href="${process.env.CLIENT_URL}/login"
                style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#4c1d95);color:#ffffff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;">
                Login to Trendora
              </a>
            </div>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;">
              <p style="color:#dc2626;font-size:12px;margin:0;font-weight:600;">⚠️ Security Notice</p>
              <p style="color:#ef4444;font-size:12px;margin:6px 0 0;line-height:1.5;">
                If you did not request this, please contact us immediately at
                <a href="mailto:${process.env.EMAIL_USER}" style="color:#7c3aed;">${process.env.EMAIL_USER}</a>.
              </p>
            </div>
          </div>
          <div style="background:#f9fafb;border-top:1px solid #ede9fe;padding:20px 32px;text-align:center;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">
              © ${new Date().getFullYear()} Trendora. All rights reserved.<br/>
              Pakistan's Creator-Brand Collaboration Platform.
            </p>
          </div>
        </div>
      `,
    });

    res.json({ message: 'New password sent to your email' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, getMe, forgotPassword, updateProfile, changePassword };