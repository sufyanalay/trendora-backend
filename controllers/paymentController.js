const Payment       = require('../models/Payment');
const Collaboration = require('../models/Collaboration');
const Notification  = require('../models/Notification');

// @GET /api/payments/brand — Brand ke payments
const getBrandPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ brandId: req.user._id })
      .populate('collaborationId', 'status agreedAmount')
      .populate('creatorId', 'fullName email')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @GET /api/payments/creator — Creator ke payments
const getCreatorPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ creatorId: req.user._id })
      .populate('collaborationId', 'status agreedAmount')
      .populate('brandId', 'fullName brandName')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/payments/:id/upload-screenshot — Brand screenshot upload kare
const uploadScreenshot = async (req, res) => {
  try {
    const { screenshotUrl, paymentNote, brandJazzCash } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    payment.screenshotUrl = screenshotUrl;
    payment.paymentNote   = paymentNote;
    payment.brandJazzCash = brandJazzCash;
    payment.status        = 'screenshot_uploaded';
    await payment.save();

    // Admin ko notification
    res.json({ message: 'Screenshot uploaded. Waiting for admin verification.', payment });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/payments/:id/verify — Admin verify kare
const verifyPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Not found' });

    payment.status     = 'verified';
    payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();
    await payment.save();

    // Collaboration payment status update
    await Collaboration.findByIdAndUpdate(payment.collaborationId, {
      paymentStatus: 'paid'
    });

    await Notification.create({
      userId:  payment.brandId,
      title:   'Payment Verified ✅',
      message: 'Your payment has been verified. Creator can now start work.',
      type:    'payment',
    });

    res.json({ message: 'Payment verified', payment });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @PUT /api/payments/:id/release — Admin creator ko release kare
const releasePayment = async (req, res) => {
  try {
    const { creatorJazzCash } = req.body;
    const payment = await Payment.findById(req.params.id)
      .populate('creatorId', 'fullName email');

    if (!payment) return res.status(404).json({ message: 'Not found' });

    payment.status          = 'released';
    payment.creatorJazzCash = creatorJazzCash || payment.creatorJazzCash;
    payment.releasedAt      = new Date();
    await payment.save();

    // Collaboration update
    await Collaboration.findByIdAndUpdate(payment.collaborationId, {
      paymentStatus: 'released'
    });

    // Creator ko notification
    await Notification.create({
      userId:  payment.creatorId._id,
      title:   'Payment Released! 💰',
      message: `PKR ${payment.creatorAmount?.toLocaleString()} has been sent to your JazzCash account.`,
      type:    'payment',
      link:    '/creator/earnings',
    });

    res.json({ message: 'Payment released to creator', payment });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @GET /api/payments/admin — Admin sab payments dekhe
const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('brandId', 'fullName brandName')
      .populate('creatorId', 'fullName')
      .populate('collaborationId', 'status')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getBrandPayments,
  getCreatorPayments,
  uploadScreenshot,
  verifyPayment,
  releasePayment,
  getAllPayments,
};