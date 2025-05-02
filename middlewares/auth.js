const catchAsyncErrors = require("./catchAsyncError");
const ErrorHandler = require("./error.js");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel.js");

const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({
        success: false,
        message: "User is not authenticated.",
    });
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  req.user = await User.findById(decoded.id);

  next();
}); 

module.exports = isAuthenticated;