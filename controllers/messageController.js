const Message       = require('../models/Message');
const Collaboration = require('../models/Collaboration');

// @GET /api/messages/:collaborationId — Messages lo
const getMessages = async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.collaborationId);
    if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

    // Sirf involved parties dekh sakti hain
    const userId = req.user._id.toString();
    if (collaboration.brandId.toString() !== userId &&
        collaboration.creatorId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await Message.find({ collaborationId: req.params.collaborationId })
      .populate('senderId', 'fullName role')
      .sort({ createdAt: 1 });

    // Mark as read
    await Message.updateMany(
      { collaborationId: req.params.collaborationId, receiverId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @POST /api/messages/:collaborationId — Message bhejo
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const collaboration = await Collaboration.findById(req.params.collaborationId);

    if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

    const userId    = req.user._id.toString();
    const isBrand   = collaboration.brandId.toString() === userId;
    const isCreator = collaboration.creatorId.toString() === userId;

    if (!isBrand && !isCreator) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const receiverId = isBrand ? collaboration.creatorId : collaboration.brandId;

    const newMessage = await Message.create({
      collaborationId: collaboration._id,
      senderId:        req.user._id,
      receiverId,
      message,
    });

    const populated = await newMessage.populate('senderId', 'fullName role');

    // ✅ Real time emit
    if (global.io) {
      global.io.to(`collab_${collaboration._id}`).emit('new_message', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getMessages, sendMessage };