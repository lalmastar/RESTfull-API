const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: {
        type: String,
        minLength: [8, "Password must have at least 8 characters."],
        maxLength: [32, "Password cannot have more than 32 characters."],
        select: false,
    },
    phone: String,
    accountVerified: {
        type: Boolean,
        default: false,
    },
    verificationCode: Number,
    verificationCodeExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

userSchema.methods.generateVerificationCode = function () {
    function generateRandomCode() {
        const firstDigit = Math.floor(Math.random() * 100) + 1; // Generates a 6-digit random number
        const remainingDigits = Math.floor(Math.random() * 10000).toString().padStart(4, 0); // Generates a 4-digit random number
        return parseInt(firstDigit + remainingDigits); // Combine first digit and remaining digits
    }
    const verificationCode = generateRandomCode();
    this.verificationCode = verificationCode;
    this.verificationCodeExpires = Date.now() + 5 * 60 * 1000; // Code expires in 10 minutes
    return verificationCode;
}

userSchema.methods.generateToken = async function () {
    return await jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_TIME,
    });
}

userSchema.methods.generateResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");
  
    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
  
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
  
    return resetToken;
  };
module.exports = mongoose.model('User', userSchema);