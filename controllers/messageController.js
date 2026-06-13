const Message       = require('../models/Message');
const Collaboration = require('../models/Collaboration');

const getMessages = async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.collaborationId);
    if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

    const userId = req.user._id.toString();
    if (collaboration.brandId.toString() !== userId &&
        collaboration.creatorId.toString() !== userId &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await Message.find({ 
      collaborationId: req.params.collaborationId 
    })
      .populate('senderId', 'fullName role _id')
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { 
        collaborationId: req.params.collaborationId, 
        receiverId: req.user._id, 
        isRead: false 
      },
      { isRead: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const collaboration = await Collaboration.findById(req.params.collaborationId);

    if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

    const userId    = req.user._id.toString();
    const isBrand   = collaboration.brandId.toString() === userId;
    const isCreator = collaboration.creatorId.toString() === userId;
    const isAdmin   = req.user.role === 'admin';

    if (!isBrand && !isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // ✅ Chat lock check — sirf non-admin ke liye
    if (!collaboration.chatUnlocked && !isAdmin) {
      return res.status(403).json({ 
        message: 'Chat is locked. Payment must be verified first.' 
      });
    }

    let receiverId
    if (isBrand)        receiverId = collaboration.creatorId
    else if (isCreator) receiverId = collaboration.brandId
    else                receiverId = collaboration.brandId

    const newMessage = await Message.create({
      collaborationId: collaboration._id,
      senderId:        req.user._id,
      receiverId,
      message,
    });

    const populated = await Message.findById(newMessage._id)
      .populate('senderId', 'fullName role _id')

    // ✅ Socket emit
    if (global.io) {
      global.io.to(`collab_${collaboration._id}`).emit('new_message', populated);
    }

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getMessages, sendMessage };