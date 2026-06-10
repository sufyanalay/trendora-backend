const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// ✅ Reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
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

    const verificationCode   = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpire = new Date(Date.now() + 30 * 60 * 1000);
    const hashedPassword     = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName, email,
      password: hashedPassword,
      role,
      socialPlatform, socialProfileUrl, address,
      brandName, websiteUrl, brandAddress,
      isVerified:         false,
      verificationCode,
      verificationExpire,
    });

    // ✅ Email send karo — error aaye to bhi user create ho
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:    `"Trendora" <${process.env.EMAIL_USER}>`,
        to:      user.email,
        subject: 'Trendora — Verify Your Email',
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ede9fe;">
            <div style="background:linear-gradient(135deg,#7c3aed,#4c1d95);padding:32px;text-align:center;">
              <span style="color:#fff;font-size:22px;font-weight:900;letter-spacing:2px;">TRENDORA</span>
              <p style="color:#ede9fe;font-size:13px;margin:8px 0 0;">Create. Connect. Grow.</p>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#1f2937;margin:0 0 8px;">Verify Your Email</h2>
              <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
                Hi <strong>${user.fullName}</strong>, use this 6-digit code to verify your email:
              </p>
              <div style="background:#f5f3ff;border:2px dashed #7c3aed;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="color:#6b7280;font-size:12px;margin:0 0 8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Verification Code</p>
                <p style="color:#7c3aed;font-size:36px;font-weight:900;letter-spacing:8px;margin:0;font-family:monospace;">${verificationCode}</p>
                <p style="color:#9ca3af;font-size:12px;margin:8px 0 0;">Expires in 30 minutes</p>
              </div>
              <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;">
                <p style="color:#dc2626;font-size:12px;margin:0;">⚠️ If you did not create an account, ignore this email.</p>
              </div>
            </div>
            <div style="background:#f9fafb;padding:16px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} Trendora. All rights reserved.</p>
            </div>
          </div>
        `,
      });
      console.log('✅ Verification email sent to:', user.email);
    } catch (emailErr) {
      console.error('❌ Email error:', emailErr.message);
      // Email fail hone par user delete karo
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }

    res.status(201).json({
      message:           'Verification code sent to your email',
      userId:            user._id,
      needsVerification: true,
    });

  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @POST /api/auth/verify-email
const verifyEmail = async (req, res) => {
  try {
    const { userId, code } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (new Date() > user.verificationExpire) {
      return res.status(400).json({ message: 'Code expired. Please register again.' });
    }

    user.isVerified         = true;
    user.verificationCode   = undefined;
    user.verificationExpire = undefined;
    await user.save();

    res.json({
      _id:      user._id,
      fullName: user.fullName,
      email:    user.email,
      role:     user.role,
      token:    generateToken(user._id),
    });

  } catch (err) {
    console.error('verifyEmail error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @POST /api/auth/resend-code
const resendCode = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ message: 'Already verified' });

    const verificationCode   = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpire = new Date(Date.now() + 30 * 60 * 1000);

    user.verificationCode   = verificationCode;
    user.verificationExpire = verificationExpire;
    await user.save();

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:    `"Trendora" <${process.env.EMAIL_USER}>`,
        to:      user.email,
        subject: 'Trendora — New Verification Code',
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:32px;background:#f5f3ff;border-radius:16px;text-align:center;">
            <h2 style="color:#7c3aed;">New Verification Code</h2>
            <p style="color:#6b7280;">Hi ${user.fullName}, your new code is:</p>
            <div style="background:#fff;border:2px dashed #7c3aed;border-radius:12px;padding:20px;margin:16px 0;">
              <p style="color:#7c3aed;font-size:32px;font-weight:900;letter-spacing:8px;margin:0;font-family:monospace;">${verificationCode}</p>
            </div>
            <p style="color:#9ca3af;font-size:12px;">Expires in 30 minutes</p>
          </div>
        `,
      });
      console.log('✅ Resend code sent to:', user.email);
    } catch (emailErr) {
      console.error('❌ Resend email error:', emailErr.message);
      return res.status(500).json({ message: 'Failed to send email' });
    }

    res.json({ message: 'New code sent to your email' });
  } catch (err) {
    console.error('resendCode error:', err.message);
    res.status(500).json({ message: 'Server error' });
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

    // ✅ Verified check
    if (!user.isVerified) {
      return res.status(401).json({
        message:           'Please verify your email first',
        needsVerification: true,
        userId:            user._id,
      });
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

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$!';
    let newPassword = '';
    for (let i = 0; i < 10; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:    `"Trendora" <${process.env.EMAIL_USER}>`,
        to:      user.email,
        subject: 'Trendora — Your New Password',
        html: `
          <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ede9fe;">
            <div style="background:linear-gradient(135deg,#7c3aed,#4c1d95);padding:32px;text-align:center;">
              <span style="color:#fff;font-size:22px;font-weight:900;letter-spacing:2px;">TRENDORA</span>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#1f2937;">Password Reset</h2>
              <p style="color:#6b7280;font-size:14px;">Hi <strong>${user.fullName}</strong>, your new password is:</p>
              <div style="background:#f5f3ff;border:2px dashed #7c3aed;border-radius:12px;padding:20px;text-align:center;margin:16px 0;">
                <p style="color:#7c3aed;font-size:24px;font-weight:900;letter-spacing:4px;margin:0;font-family:monospace;">${newPassword}</p>
              </div>
              <p style="color:#6b7280;font-size:13px;">Please login and change your password immediately.</p>
              <div style="text-align:center;margin-top:20px;">
                <a href="${process.env.CLIENT_URL}/login"
                  style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;">
                  Login Now
                </a>
              </div>
            </div>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('❌ Forgot password email error:', emailErr.message);
      return res.status(500).json({ message: 'Failed to send email' });
    }

    res.json({ message: 'New password sent to your email' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  updateProfile,
  changePassword,
  verifyEmail,
  resendCode,
};