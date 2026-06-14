const Review        = require('../models/Review');
const Collaboration = require('../models/Collaboration');
const User          = require('../models/User');
const Notification  = require('../models/Notification');

const createNotification = async (userId, title, message, type, link) => {
  try {
    const notif = await Notification.create({ userId, title, message, type, link });
    if (global.io) global.io.to(userId.toString()).emit('new_notification', notif);
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

// @POST /api/reviews — Brand review de
const createReview = async (req, res) => {
  try {
    const { collaborationId, rating, review } = req.body;

    if (!rating || !review) {
      return res.status(400).json({ message: 'Rating and review are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const collaboration = await Collaboration.findById(collaborationId);
    if (!collaboration) {
      return res.status(404).json({ message: 'Collaboration not found' });
    }

    // Sirf brand review de sakta hai
    if (collaboration.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only brand can give review' });
    }

    // Sirf completed collaboration ka review
    if (collaboration.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed collaborations' });
    }

    // Already review dia?
    const existing = await Review.findOne({ collaborationId, brandId: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this collaboration' });
    }

    const newReview = await Review.create({
      collaborationId,
      brandId:   req.user._id,
      creatorId: collaboration.creatorId,
      rating,
      review,
    });

    // ✅ Creator ka average rating update karo
    const allReviews = await Review.find({ creatorId: collaboration.creatorId });
    const avgRating  = allReviews.reduce((a, r) => a + r.rating, 0) / allReviews.length;

    await User.findByIdAndUpdate(collaboration.creatorId, {
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews:  allReviews.length,
    });

    // Creator ko notify
    await createNotification(
      collaboration.creatorId,
      'New Review Received! ⭐',
      `You received a ${rating}-star review.`,
      'system',
      '/creator/profile'
    );

    res.status(201).json(newReview);
  } catch (err) {
    console.error('createReview error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// @GET /api/reviews/creator/:creatorId — Creator ke reviews
const getCreatorReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ creatorId: req.params.creatorId })
      .populate('brandId', 'fullName brandName')
      .populate('collaborationId', 'opportunityId')
      .sort({ createdAt: -1 });

    const avgRating = reviews.length
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : 0;

    res.json({
      reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      total:     reviews.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @GET /api/reviews/my — Creator apne reviews dekhe
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ creatorId: req.user._id })
      .populate('brandId', 'fullName brandName')
      .sort({ createdAt: -1 });

    const avgRating = reviews.length
      ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length
      : 0;

    res.json({
      reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      total:     reviews.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createReview, getCreatorReviews, getMyReviews };