// const Message       = require('../models/Message');
// const Collaboration = require('../models/Collaboration');

// const getMessages = async (req, res) => {
//   try {
//     const collaboration = await Collaboration.findById(req.params.collaborationId);
//     if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

//     const userId = req.user._id.toString();
//     if (collaboration.brandId.toString() !== userId &&
//         collaboration.creatorId.toString() !== userId &&
//         req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Not authorized' });
//     }

//     // ✅ Pagination
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 50;
//     const skip = (page - 1) * limit;

//     // ✅ Get total count
//     const total = await Message.countDocuments({ 
//       collaborationId: req.params.collaborationId 
//     });

//     // ✅ Fetch messages with pagination
//     const messages = await Message.find({ 
//       collaborationId: req.params.collaborationId 
//     })
//       .populate('senderId', 'fullName role _id profileImage')
//       .select('collaborationId senderId receiverId message isRead createdAt')
//       .lean()
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: 1 });

//     // ✅ Mark as read in background (non-blocking)
//     Message.updateMany(
//       { 
//         collaborationId: req.params.collaborationId, 
//         receiverId: req.user._id, 
//         isRead: false 
//       },
//       { isRead: true }
//     ).catch(err => console.error('markAsRead error:', err.message));

//     res.json({
//       messages,
//       pagination: {
//         total,
//         page,
//         limit,
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (err) {
//     console.error('getMessages error:', err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// const sendMessage = async (req, res) => {
//   try {
//     const { message } = req.body;
//     const collaboration = await Collaboration.findById(req.params.collaborationId);

//     if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

//     const userId    = req.user._id.toString();
//     const isBrand   = collaboration.brandId.toString() === userId;
//     const isCreator = collaboration.creatorId.toString() === userId;
//     const isAdmin   = req.user.role === 'admin';

//     if (!isBrand && !isCreator && !isAdmin) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }

//     // ✅ Chat lock check — sirf non-admin ke liye
//     if (!collaboration.chatUnlocked && !isAdmin) {
//       return res.status(403).json({ 
//         message: 'Chat is locked. Payment must be verified first.' 
//       });
//     }

//     let receiverId
//     if (isBrand)        receiverId = collaboration.creatorId
//     else if (isCreator) receiverId = collaboration.brandId
//     else                receiverId = collaboration.brandId

//     const newMessage = await Message.create({
//       collaborationId: collaboration._id,
//       senderId:        req.user._id,
//       receiverId,
//       message,
//     });

//     const populated = await Message.findById(newMessage._id)
//       .populate('senderId', 'fullName role _id profileImage')

//     // ✅ Socket emit to collaboration room
//     if (global.io) {
//       global.io.to(`collab_${collaboration._id}`).emit('new_message', populated);
//     }

//     res.status(201).json(populated);
//   } catch (err) {
//     console.error('sendMessage error:', err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// // ✅ NEW: Join collaboration socket room
// const joinCollaborationRoom = async (req, res) => {
//   try {
//     const { collaborationId } = req.params;
//     const collaboration = await Collaboration.findById(collaborationId).lean();

//     if (!collaboration) {
//       return res.status(404).json({ message: 'Collaboration not found' });
//     }

//     const userId = req.user._id.toString();
//     const isBrand = collaboration.brandId.toString() === userId;
//     const isCreator = collaboration.creatorId.toString() === userId;
//     const isAdmin = req.user.role === 'admin';

//     if (!isBrand && !isCreator && !isAdmin) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }

//     // ✅ Get unread count
//     const unreadCount = await Message.countDocuments({
//       collaborationId,
//       receiverId: req.user._id,
//       isRead: false
//     });

//     res.json({ 
//       message: 'Joined collaboration room',
//       roomId: `collab_${collaborationId}`,
//       unreadCount,
//       chatUnlocked: collaboration.chatUnlocked
//     });
//   } catch (err) {
//     console.error('joinCollaborationRoom error:', err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// module.exports = { getMessages, sendMessage, joinCollaborationRoom };



// const Message       = require('../models/Message');
// const Collaboration = require('../models/Collaboration');
// const Notification  = require('../models/Notification');

// const getMessages = async (req, res) => {
//   try {
//     const collaboration = await Collaboration.findById(req.params.collaborationId);
//     if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

//     const userId = req.user._id.toString();
//     if (collaboration.brandId.toString() !== userId &&
//         collaboration.creatorId.toString() !== userId &&
//         req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Not authorized' });
//     }

//     const page  = parseInt(req.query.page)  || 1;
//     const limit = parseInt(req.query.limit) || 50;
//     const skip  = (page - 1) * limit;

//     const total = await Message.countDocuments({
//       collaborationId: req.params.collaborationId
//     });

//     const messages = await Message.find({
//       collaborationId: req.params.collaborationId
//     })
//       .populate('senderId', 'fullName role _id')
//       .select('collaborationId senderId receiverId message isRead createdAt')
//       .lean()
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: 1 });

//     // Background mein mark as read
//     Message.updateMany(
//       {
//         collaborationId: req.params.collaborationId,
//         receiverId:      req.user._id,
//         isRead:          false
//       },
//       { isRead: true }
//     ).catch(err => console.error('markAsRead error:', err.message));

//     res.json({
//       messages,
//       pagination: { total, page, limit, pages: Math.ceil(total / limit) }
//     });
//   } catch (err) {
//     console.error('getMessages error:', err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// const sendMessage = async (req, res) => {
//   try {
//     const { message } = req.body;
//     const collaboration = await Collaboration.findById(req.params.collaborationId);

//     if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

//     const userId    = req.user._id.toString();
//     const isBrand   = collaboration.brandId.toString() === userId;
//     const isCreator = collaboration.creatorId.toString() === userId;
//     const isAdmin   = req.user.role === 'admin';

//     if (!isBrand && !isCreator && !isAdmin) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }

//     if (!collaboration.chatUnlocked && !isAdmin) {
//       return res.status(403).json({ message: 'Chat is locked. Payment must be verified first.' });
//     }

//     let receiverId
//     if (isBrand)        receiverId = collaboration.creatorId
//     else if (isCreator) receiverId = collaboration.brandId
//     else                receiverId = collaboration.brandId

//     const newMessage = await Message.create({
//       collaborationId: collaboration._id,
//       senderId:        req.user._id,
//       receiverId,
//       message,
//     });

//     const populated = await Message.findById(newMessage._id)
//       .populate('senderId', 'fullName role _id')

//     // ✅ Collaboration room mein emit karo
//     if (global.io) {
//       global.io.to(`collab_${collaboration._id}`).emit('new_message', populated);
//     }

//     // ✅ WhatsApp style — receiver ko notification bhejo
//     // Sirf tab jab receiver us room mein nahi hai
//     try {
//       const senderName = req.user.fullName || 'Someone'
//       const notif = await Notification.create({
//         userId:  receiverId,
//         title:   `💬 New Message from ${senderName}`,
//         message: message.length > 50 ? message.substring(0, 50) + '...' : message,
//         type:    'message',
//         link:    isBrand
//           ? '/creator/collaborations'
//           : '/brand/collaborations',
//       });

//       // ✅ User ke personal room mein notification bhejo
//       if (global.io) {
//         global.io.to(receiverId.toString()).emit('new_notification', notif);
//         // ✅ Alag message_notification event bhi bhejo
//         global.io.to(receiverId.toString()).emit('message_notification', {
//           collaborationId: collaboration._id.toString(),
//           senderName,
//           message: message.length > 50 ? message.substring(0, 50) + '...' : message,
//         });
//       }
//     } catch (notifErr) {
//       console.error('Message notification error:', notifErr.message);
//     }

//     res.status(201).json(populated);
//   } catch (err) {
//     console.error('sendMessage error:', err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// const joinCollaborationRoom = async (req, res) => {
//   try {
//     const { collaborationId } = req.params;
//     const collaboration = await Collaboration.findById(collaborationId).lean();

//     if (!collaboration) {
//       return res.status(404).json({ message: 'Collaboration not found' });
//     }

//     const userId    = req.user._id.toString();
//     const isBrand   = collaboration.brandId.toString() === userId;
//     const isCreator = collaboration.creatorId.toString() === userId;
//     const isAdmin   = req.user.role === 'admin';

//     if (!isBrand && !isCreator && !isAdmin) {
//       return res.status(403).json({ message: 'Not authorized' });
//     }

//     const unreadCount = await Message.countDocuments({
//       collaborationId,
//       receiverId: req.user._id,
//       isRead:     false
//     });

//     res.json({
//       message:      'Joined collaboration room',
//       roomId:       `collab_${collaborationId}`,
//       unreadCount,
//       chatUnlocked: collaboration.chatUnlocked
//     });
//   } catch (err) {
//     console.error('joinCollaborationRoom error:', err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// module.exports = { getMessages, sendMessage, joinCollaborationRoom };


const Message       = require('../models/Message');
const Collaboration = require('../models/Collaboration');
const Notification  = require('../models/Notification');

// ✅ GET messages — fast, no join needed
const getMessages = async (req, res) => {
  try {
    const collaboration = await Collaboration.findById(req.params.collaborationId).lean();
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
      .lean()
      .sort({ createdAt: 1 })
      .limit(100);

    // Background read
    Message.updateMany(
      { collaborationId: req.params.collaborationId, receiverId: req.user._id, isRead: false },
      { isRead: true }
    ).catch(() => {});

    // ✅ Sirf messages array return karo — frontend compatible
    res.json(messages);
  } catch (err) {
    console.error('getMessages error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const collaboration = await Collaboration.findById(req.params.collaborationId).lean();

    if (!collaboration) return res.status(404).json({ message: 'Collaboration not found' });

    const userId    = req.user._id.toString();
    const isBrand   = collaboration.brandId.toString() === userId;
    const isCreator = collaboration.creatorId.toString() === userId;
    const isAdmin   = req.user.role === 'admin';

    if (!isBrand && !isCreator && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!collaboration.chatUnlocked && !isAdmin) {
      return res.status(403).json({ message: 'Chat is locked. Payment must be verified first.' });
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
      .lean();

    // ✅ Collaboration room mein instant emit
    if (global.io) {
      global.io.to(`collab_${collaboration._id}`).emit('new_message', populated);
    }

    // ✅ WhatsApp notification — receiver ke personal room mein
    try {
      const senderName = req.user.fullName || 'Someone'
      const shortMsg   = message.length > 60 ? message.substring(0, 60) + '...' : message

      const notif = await Notification.create({
        userId:  receiverId,
        title:   `💬 ${senderName}`,
        message: shortMsg,
        type:    'message',
        link:    isBrand ? '/creator/collaborations' : '/brand/collaborations',
      });

      if (global.io) {
        // Bell notification
        global.io.to(receiverId.toString()).emit('new_notification', notif);
        // WhatsApp toast
        global.io.to(receiverId.toString()).emit('message_notification', {
          collaborationId: collaboration._id.toString(),
          senderName,
          message: shortMsg,
        });
      }
    } catch (notifErr) {
      console.error('Notification error:', notifErr.message);
    }

    res.status(201).json(populated);
  } catch (err) {
    console.error('sendMessage error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const joinCollaborationRoom = async (req, res) => {
  try {
    const { collaborationId } = req.params;
    const collaboration = await Collaboration.findById(collaborationId).lean();
    if (!collaboration) return res.status(404).json({ message: 'Not found' });

    const userId = req.user._id.toString();
    if (collaboration.brandId.toString() !== userId &&
        collaboration.creatorId.toString() !== userId &&
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ chatUnlocked: collaboration.chatUnlocked });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getMessages, sendMessage, joinCollaborationRoom };