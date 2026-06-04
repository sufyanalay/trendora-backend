const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const dotenv   = require('dotenv');

dotenv.config();

// Actual User model import karo
const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    const email    = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    const fullName = process.env.ADMIN_NAME;

    if (!email || !password || !fullName) {
      console.error('❌ ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME .env mein set karo!');
      process.exit(1);
    }

    // Pehle check karo exist karta hai ya nahi
    const exists = await User.findOne({ email });

    if (exists) {
      // Exist karta hai — sirf role admin karo
      await User.findOneAndUpdate({ email }, { role: 'admin' })
      console.log('✅ User already exists — role admin kar diya!')
      console.log('Email:   ', email);
      console.log('Password:', password);
      process.exit();
    }

    // Naya admin banao
    const hashed = await bcrypt.hash(password, 10);
    await User.create({
      fullName,
      email,
      password: hashed,
      role: 'admin',
    });

    console.log('✅ Admin created successfully!');
    console.log('Email:   ', email);
    console.log('Password:', password);
    process.exit();

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
};

createAdmin();