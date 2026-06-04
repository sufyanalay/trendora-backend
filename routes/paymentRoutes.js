const express = require('express');
const router  = express.Router();
const {
  getBrandPayments,
  getCreatorPayments,
  uploadScreenshot,
  verifyPayment,
  releasePayment,
  getAllPayments,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/authMiddleware');

router.get('/brand',              protect, getBrandPayments);
router.get('/creator',            protect, getCreatorPayments);
router.get('/admin',              protect, adminOnly, getAllPayments);
router.put('/:id/upload-screenshot', protect, uploadScreenshot);
router.put('/:id/verify',         protect, adminOnly, verifyPayment);
router.put('/:id/release',        protect, adminOnly, releasePayment);

module.exports = router;