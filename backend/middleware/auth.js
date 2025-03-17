const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  let token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token && req.cookies) {
    token = req.cookies.token; // Check for token in cookies
  }
  console.log('Cookies received:', req.cookies);
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
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