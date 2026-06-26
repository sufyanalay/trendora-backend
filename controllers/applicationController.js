const Application = require("../models/Application");
const Opportunity = require("../models/Opportunity");
const User = require("../models/User");

// @POST /api/applications
const applyToOpportunity = async (req, res) => {
  try {
    const { opportunityId, offerType, counterAmount, note } = req.body;

    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity)
      return res.status(404).json({ message: "Opportunity not found" });
    if (opportunity.status !== "active") {
      return res
        .status(400)
        .json({ message: "This opportunity is no longer active" });
    }

    // Already applied check
    const existing = await Application.findOne({
      opportunityId,
      creatorId: req.user._id,
      status: { $nin: ["withdrawn", "rejected"] },
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You have already applied to this opportunity" });
    }

    // ✅ Withdraw ban check
    // const creator = await User.findById(req.user._id);
    // if (
    //   creator.withdrawBannedUntil &&
    //   new Date() < creator.withdrawBannedUntil
    // ) {
    //   const banDate = creator.withdrawBannedUntil.toLocaleDateString("en-PK");
    //   return res.status(403).json({
    //     message: `You are temporarily banned from applying due to too many withdrawals. Ban lifts on ${banDate}`,
    //   });
    // }

    // ✅ Counter amount validation
    if (offerType === "counter") {
      if (!counterAmount || counterAmount <= 0) {
        return res
          .status(400)
          .json({ message: "Counter amount must be greater than 0" });
      }
      // Minimum 10% of budget
      const minAmount = Math.floor(opportunity.budget * 0.1);
      if (counterAmount < minAmount) {
        return res.status(400).json({
          message: `Counter amount must be at least PKR ${minAmount.toLocaleString()} (10% of budget)`,
        });
      }
    }

    const application = await Application.create({
      opportunityId,
      creatorId: req.user._id,
      brandId: opportunity.brandId,
      offerType,
      counterAmount:
        offerType === "counter" ? counterAmount : opportunity.budget,
      note,
    });

    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @GET /api/applications/my
const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ creatorId: req.user._id })
      .populate(
        "opportunityId",
        "title budget platform category deadline brandName",
      )
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @GET /api/applications/brand
const getBrandApplications = async (req, res) => {
  try {
    const applications = await Application.find({ brandId: req.user._id })
      .populate("opportunityId", "title budget platform category")
      .populate(
        "creatorId",
        "fullName email socialPlatform socialProfileUrl averageRating totalReviews",
      )
      .sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/applications/:id/respond — Brand responds
const respondToApplication = async (req, res) => {
  try {
    const { action, counterAmount, note } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application)
      return res.status(404).json({ message: "Application not found" });
    if (application.brandId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (action === "accept") {
      application.status = "accepted";
    } else if (action === "reject") {
      application.status = "rejected";
    } else if (action === "counter") {
      application.status = "countered";
      application.lastCounterBy = "brand";
      application.lastCounterAmount = counterAmount;
      application.lastCounterNote = note;
    }

    await application.save();
    res.json(application);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/applications/:id/creator-respond — Creator responds to counter
const creatorRespond = async (req, res) => {
  try {
    const { action, counterAmount, note } = req.body;
    const application = await Application.findById(req.params.id).populate(
      "opportunityId",
      "budget",
    );

    if (!application)
      return res.status(404).json({ message: "Application not found" });
    if (application.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // ✅ Counter min validation
    if (action === "counter") {
      const minAmount = Math.floor(application.opportunityId.budget * 0.1);
      if (!counterAmount || counterAmount < minAmount) {
        return res.status(400).json({
          message: `Counter amount must be at least PKR ${minAmount.toLocaleString()} (10% of budget)`,
        });
      }
    }

    if (action === "accept") {
      application.status = "accepted";
    } else if (action === "reject") {
      application.status = "rejected";
    } else if (action === "counter") {
      application.status = "countered";
      application.lastCounterBy = "creator";
      application.lastCounterAmount = counterAmount;
      application.lastCounterNote = note;
    }

    await application.save();
    res.json(application);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @PUT /api/applications/:id — Creator edits pending application
const editApplication = async (req, res) => {
  try {
    const { counterAmount, note } = req.body;
    const application = await Application.findById(req.params.id).populate(
      "opportunityId",
      "budget",
    );

    if (!application) return res.status(404).json({ message: "Not found" });
    if (application.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (application.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Can only edit pending applications" });
    }

    const minAmount = Math.floor(application.opportunityId.budget * 0.1);
    if (counterAmount < minAmount) {
      return res.status(400).json({
        message: `Amount must be at least PKR ${minAmount.toLocaleString()}`,
      });
    }

    application.counterAmount = counterAmount;
    application.note = note;
    await application.save();

    res.json(application);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// @DELETE /api/applications/:id — Creator withdraws
const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) return res.status(404).json({ message: "Not found" });
    if (application.creatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (application.status === "accepted") {
      return res
        .status(400)
        .json({ message: "Cannot withdraw accepted application" });
    }

    application.status = "withdrawn";
    await application.save();

    // ✅ Withdraw count update — 3 bar withdraw kare to 7 din ban
    const creator = await User.findById(req.user._id);
    creator.withdrawCount = (creator.withdrawCount || 0) + 1;

    // if (creator.withdrawCount >= 30) {
    //   creator.withdrawBannedUntil = new Date(
    //     Date.now() + 7 * 24 * 60 * 60 * 1000,
    //   );
    //   creator.withdrawCount = 0;
    // }
    await creator.save();

    res.json({
      message: "Application withdrawn",
      withdrawCount: creator.withdrawCount,
      banned: !!creator.withdrawBannedUntil,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  applyToOpportunity,
  getMyApplications,
  getBrandApplications,
  respondToApplication,
  creatorRespond,
  editApplication,
  withdrawApplication,
};

// const Application = require('../models/Application');
// const Opportunity = require('../models/Opportunity');

// // @POST /api/applications — Creator applies
// const applyToOpportunity = async (req, res) => {
//   try {
//     const { opportunityId, offerType, counterAmount, note } = req.body;

//     // Check opportunity exists
//     const opportunity = await Opportunity.findById(opportunityId);
//     if (!opportunity) {
//       return res.status(404).json({ message: 'Opportunity not found' });
//     }
//     if (opportunity.status !== 'active') {
//       return res.status(400).json({ message: 'This opportunity is no longer active' });
//     }

//     // Check already applied
//     const existing = await Application.findOne({
//       opportunityId,
//       creatorId: req.user._id,
//     });
//     if (existing) {
//       return res.status(400).json({ message: 'You have already applied to this opportunity' });
//     }

//     const application = await Application.create({
//       opportunityId,
//       creatorId:     req.user._id,
//       brandId:       opportunity.brandId,
//       offerType,
//       counterAmount: offerType === 'counter' ? counterAmount : opportunity.budget,
//       note,
//     });

//     res.status(201).json(application);

//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };

// // @GET /api/applications/my — Creator ke apne applications
// const getMyApplications = async (req, res) => {
//   try {
//     const applications = await Application.find({ creatorId: req.user._id })
//       .populate('opportunityId', 'title budget platform category deadline brandName')
//       .sort({ createdAt: -1 });

//     res.json(applications);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // @GET /api/applications/brand — Brand ke received applications
// const getBrandApplications = async (req, res) => {
//   try {
//     const applications = await Application.find({ brandId: req.user._id })
//       .populate('opportunityId', 'title budget platform category')
//       .populate('creatorId', 'fullName email socialPlatform socialProfileUrl')
//       .sort({ createdAt: -1 });

//     res.json(applications);
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // @PUT /api/applications/:id/respond — Brand responds (accept/reject/counter)
// const respondToApplication = async (req, res) => {
//   try {
//     const { action, counterAmount, note } = req.body;
//     const application = await Application.findById(req.params.id);

//     if (!application) {
//       return res.status(404).json({ message: 'Application not found' });
//     }

//     // Only brand can respond
//     if (application.brandId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }

//     if (action === 'accept') {
//       application.status = 'accepted';
//     } else if (action === 'reject') {
//       application.status = 'rejected';
//     } else if (action === 'counter') {
//       application.status          = 'countered';
//       application.lastCounterBy     = 'brand';
//       application.lastCounterAmount = counterAmount;
//       application.lastCounterNote   = note;
//     }

//     await application.save();
//     res.json(application);

//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // @PUT /api/applications/:id/creator-respond — Creator responds to counter
// const creatorRespond = async (req, res) => {
//   try {
//     const { action, counterAmount, note } = req.body;
//     const application = await Application.findById(req.params.id);

//     if (!application) {
//       return res.status(404).json({ message: 'Application not found' });
//     }

//     if (application.creatorId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }

//     if (action === 'accept') {
//       application.status = 'accepted';
//     } else if (action === 'reject') {
//       application.status = 'rejected';
//     } else if (action === 'counter') {
//       application.status            = 'countered';
//       application.lastCounterBy     = 'creator';
//       application.lastCounterAmount = counterAmount;
//       application.lastCounterNote   = note;
//     }

//     await application.save();
//     res.json(application);

//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // @DELETE /api/applications/:id — Creator withdraws
// const withdrawApplication = async (req, res) => {
//   try {
//     const application = await Application.findById(req.params.id);

//     if (!application) {
//       return res.status(404).json({ message: 'Application not found' });
//     }
//     if (application.creatorId.toString() !== req.user._id.toString()) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }
//     if (application.status === 'accepted') {
//       return res.status(400).json({ message: 'Cannot withdraw accepted application' });
//     }

//     application.status = 'withdrawn';
//     await application.save();
//     res.json({ message: 'Application withdrawn' });

//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// module.exports = {
//   applyToOpportunity,
//   getMyApplications,
//   getBrandApplications,
//   respondToApplication,
//   creatorRespond,
//   withdrawApplication,
// };
