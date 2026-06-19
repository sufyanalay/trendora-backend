// const express    = require('express');
// const cors       = require('cors');
// const dotenv     = require('dotenv');
// const http       = require('http');
// const { Server } = require('socket.io');
// const connectDB  = require('./config/db');

// dotenv.config();



// const cloudinary   = require('./config/cloudinary');
// connectDB();

// const app    = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   }
// });

// // Socket.io global access
// global.io = io;

// app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
// app.use(cors());
// app.options('*', cors());
// app.use(express.json());

// // Routes
// app.use('/api/auth',           require('./routes/authRoutes'));
// app.use('/api/opportunities',  require('./routes/opportunityRoutes'));
// app.use('/api/applications',   require('./routes/applicationRoutes'));
// app.use('/api/collaborations', require('./routes/collaborationRoutes'));
// app.use('/api/payments',       require('./routes/paymentRoutes'));
// app.use('/api/messages',       require('./routes/messageRoutes'));
// app.use('/api/notifications',  require('./routes/notificationRoutes'));
// app.use('/api/admin',          require('./routes/adminRoutes'));
// app.use('/api/upload', require('./routes/uploadRoutes'))
// app.use('/api/reviews', require('./routes/reviewRoutes'));
// app.use('/api/disputes', require('./routes/disputeRoutes'))

// app.get('/', (req, res) => res.send('Trendora API Running...'));

// // Socket.io connection
// io.on('connection', (socket) => {
//   console.log('User connected:', socket.id);

//   socket.on('join', (userId) => {
//     socket.join(userId)
//     console.log(`User ${userId} joined room`)
//   })

//   socket.on('join_collaboration', (collaborationId) => {
//     socket.join(`collab_${collaborationId}`)
//     console.log(`Joined collab room: ${collaborationId}`)
//   })

//   socket.on('leave_collaboration', (collaborationId) => {
//     socket.leave(`collab_${collaborationId}`)
//     console.log(`Left collab room: ${collaborationId}`)
//   })

//   socket.on('send_message', (data) => {
//     io.to(`collab_${data.collaborationId}`).emit('new_message', data)
//   })

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id)
//   })
// })
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// module.exports = app;



const express    = require('express');
const cors       = require('cors');
const dotenv     = require('dotenv');
const http       = require('http');
const { Server } = require('socket.io');

// ✅ PEHLE dotenv
dotenv.config();

const connectDB  = require('./config/db');
const cloudinary = require('./config/cloudinary');

connectDB();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

global.io = io;

// ✅ CORS — specific origins
const allowedOrigins = [
  'http://localhost:5173',
  'https://trendoura.vercel.app',
  'https://trendora-backend-kappa.vercel.app',
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(null, true) // ← temporarily sab allow karo
    }
  },
  methods:         ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders:  ['Content-Type', 'Authorization'],
  credentials:     true,
}))

app.options('*', cors())
app.use(express.json())

// Routes
app.use('/api/auth',           require('./routes/authRoutes'))
app.use('/api/opportunities',  require('./routes/opportunityRoutes'))
app.use('/api/applications',   require('./routes/applicationRoutes'))
app.use('/api/collaborations', require('./routes/collaborationRoutes'))
app.use('/api/payments',       require('./routes/paymentRoutes'))
app.use('/api/messages',       require('./routes/messageRoutes'))
app.use('/api/notifications',  require('./routes/notificationRoutes'))
app.use('/api/admin',          require('./routes/adminRoutes'))
app.use('/api/upload',         require('./routes/uploadRoutes'))
app.use('/api/reviews',        require('./routes/reviewRoutes'))
app.use('/api/disputes',       require('./routes/disputeRoutes'))

app.get('/', (req, res) => res.send('Trendora API Running...'))

// Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join', (userId) => {
    socket.join(userId)
    console.log(`User ${userId} joined room`)
  })

  socket.on('join_collaboration', (collaborationId) => {
    socket.join(`collab_${collaborationId}`)
  })

  socket.on('leave_collaboration', (collaborationId) => {
    socket.leave(`collab_${collaborationId}`)
  })

  socket.on('send_message', (data) => {
    io.to(`collab_${data.collaborationId}`).emit('new_message', data)
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

// ✅ Vercel ke liye app export karo
module.exports = app