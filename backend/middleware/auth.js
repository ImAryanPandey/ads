const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.cookies?.token; // Check for token in cookies
  console.log('Cookies received:', req.cookies);
  console.log('Token found:', token);

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token:', decoded); // Log to confirm structure
    req.user = { id: decoded.id, role: decoded.role }; // Explicitly set id and role
    next();
  } catch (error) {
    console.error('Token verification error:', error.message); // Log the error
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const role = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = { auth, role };