const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

app.use(express.json());

// Routes
app.use('/api/auth',           require('./routes/authRoutes'));
app.use('/api/opportunities',  require('./routes/opportunityRoutes'));
app.use('/api/applications',   require('./routes/applicationRoutes'));
app.use('/api/collaborations', require('./routes/collaborationRoutes'));
app.use('/api/payments',       require('./routes/paymentRoutes'));
app.use('/api/messages',       require('./routes/messageRoutes'));
app.use('/api/notifications',  require('./routes/notificationRoutes'));
app.use('/api/admin',          require('./routes/adminRoutes'));

app.get('/', (req, res) => {
  res.send('Trendora API Running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;