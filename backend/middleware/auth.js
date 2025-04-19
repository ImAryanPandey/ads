const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Log incoming cookies for debugging (mask sensitive data in production if needed)
  const cookies = req.cookies || {};
  console.log('Auth Middleware - Cookies received:', Object.keys(cookies).length ? cookies : 'No cookies');

  // Extract token from cookies
  const token = cookies.token;
  console.log('Auth Middleware - Token:', token ? token.slice(0, 10) + '...' : 'undefined');

  // Check if token exists
  if (!token) {
    console.log('Auth Middleware - No token found, authorization denied');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token and extract payload
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      throw new Error('Invalid token payload');
    }
    console.log('Auth Middleware - Decoded token (id only):', { id: decoded.id }); // Avoid logging full decoded object in production
    req.user = { id: decoded.id, role: decoded.role || '' }; // Default role to empty string if undefined
    next();
  } catch (error) {
    console.error('Auth Middleware - Token verification error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const role = (requiredRole) => (req, res, next) => {
  // Ensure req.user exists before checking role
  if (!req.user || typeof req.user !== 'object') {
    console.log('Role Middleware - User object not found in request');
    return res.status(401).json({ message: 'User not authenticated' });
  }
  console.log('Role Middleware - User role:', req.user.role, 'Required role:', requiredRole);
  if (req.user.role !== requiredRole) {
    console.log('Role Middleware - Access denied for user role:', req.user.role);
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

module.exports = { auth, role };