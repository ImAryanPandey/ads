const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.cookies?.token;
  console.log('Auth Middleware - Cookies:', req.cookies);
  console.log('Auth Middleware - Token:', token);

  if (!token) {
    console.log('Auth Middleware - No token found');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth Middleware - Decoded token:', decoded);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    console.error('Auth Middleware - Token verification error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const role = (requiredRole) => (req, res, next) => {
  console.log('Role Middleware - User role:', req.user.role, 'Required role:', requiredRole);
  if (req.user.role !== requiredRole) {
    console.log('Role Middleware - Access denied for user:', req.user);
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = { auth, role };  