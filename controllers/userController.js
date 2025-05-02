const crypto = require("crypto");
const ErrorHandler = require('../middlewares/error.js');
const catchAsyncErrors = require("../middlewares/catchAsyncError.js");
const User = require("../models/userModel.js");
const twilio = require("twilio");
const twilioClient = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const sendEmail = require("../utils/sendEmail.js");
const sendToken = require("../utils/sendToken.js");
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const register = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, email, password, phone, verificationMethod } = req.body;
    if (!name || !email || !password || !phone || !verificationMethod) {
      return res.status(400).json({
        success: false,
        message: "Please fill all the fields.",
      });
    }

    function validatePhoneNumber(phone) {
      const phoneRegex = /^\+91\d{10}$/; // Example regex for 10-digit phone number
      return phoneRegex.test(phone);
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number.",
      });
    }

    const userExists = await User.findOne({
      $or: [
        {
          email,
          accountVerified: true,
        },
        {
          phone,
          accountVerified: true,
        },
      ],
    });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists.",
      });
    }

    const registerstionAttemptsByUser = await User.find({
      $or: [
        {
          email,
          accountVerified: false,
        },
        {
          phone,
          accountVerified: false,
        },
      ],
    });

    if (registerstionAttemptsByUser.length > 3) {
      return res.status(400).json({
        success: false,
        message: "You have reached the maximum number of registration attempts. Please try again later",
      });
      
    }

    const user = await User.create({ name, email, password, phone });
    const verificationCode = await user.generateVerificationCode();
    console.log(user, verificationCode);
    await user.save();
    sendVerificationCode(
      verificationMethod,
      verificationCode,
      name,
      email,
      phone,
      res
    );
  } catch (error) {
    next(error);
  }
});

const sendVerificationCode = async (
  verificationMethod,
  verificationCode,
  name,
  email,
  phone,
  res
) => {
  console.log(verificationMethod, verificationCode, name, email, phone, res);
  try {
    if (verificationMethod === "email") {
      const message = generateEmailTemplate(verificationCode);
      sendEmail(email, "Your Verification Code", message);
      res.status(200).json({
        success: true,
        message: `Verification email successfully sent to ${name}`,
      });
    } else if (verificationMethod === "phone") {
      const verificationCodeWithSpace = verificationCode
        .toString()
        .split("")
        .join(" ");
      await client.calls.create({
        twiml: `<Response><Say>Your verification code is ${verificationCodeWithSpace}. Your verification code is ${verificationCodeWithSpace}.</Say></Response>`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      res.status(200).json({
        success: true,
        message: `OTP sent.`,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Invalid verification method.",
      });
    }
  } catch (error) {
    // console.log(error);
    return res.status(500).json({
      success: false,
      message: "Verification code failed to send.",
    });
  }
};

const generateEmailTemplate = (verificationCode) => {
  return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h2 style="color: #4CAF50; text-align: center;">Verification Code</h2>
      <p style="font-size: 16px; color: #333;">Dear User,</p>
      <p style="font-size: 16px; color: #333;">Your verification code is:</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="display: inline-block; font-size: 24px; font-weight: bold; color: #4CAF50; padding: 10px 20px; border: 1px solid #4CAF50; border-radius: 5px; background-color: #e8f5e9;">
          ${verificationCode}
        </span>
      </div>
      <p style="font-size: 16px; color: #333;">Please use this code to verify your email address. The code will expire in 10 minutes.</p>
      <p style="font-size: 16px; color: #333;">If you did not request this, please ignore this email.</p>
      <footer style="margin-top: 20px; text-align: center; font-size: 14px; color: #999;">
        <p>Thank you,<br>Your Company Team</p>
        <p style="font-size: 12px; color: #aaa;">This is an automated message. Please do not reply to this email.</p>
      </footer>
    </div>
    `;
};

const verifyOTP = catchAsyncErrors(async (req, res, next) => {
  const { email, otp, phone } = req.body;
  //   console.log(email, otp, phone);

  function validatePhoneNumber(phone) {
    const phoneRegex = /^\+91\d{10}$/; // Example regex for 10-digit phone number
    return phoneRegex.test(phone);
  }
  if (!validatePhoneNumber(phone)) {
    return res.status(500).json({
      success: false,
      message: "Invalid phone number",
    });
  }

  try {
    const userAllEntries = await User.find({
      $or: [
        {
          email,
          accountVerified: false,
        },
        {
          phone,
          accountVerified: false,
        },
      ],
    }).sort({ createdAt: -1 });

    if (!userAllEntries) {
      return res.status(500).json({
        success: false,
        message: "User not found",
      });
    }

    let user;
    if (userAllEntries.length > 1) {
      user = userAllEntries[0];

      await User.deleteMany({
        _id: { $ne: user._id },
        $or: [
          {
            email,
            accountVerified: false,
          },
          {
            phone,
            accountVerified: false,
          },
        ],
      });
    } else {
      user = userAllEntries[0];
    }

    if (user.verificationCode !== Number(otp)) {
      return res.status(500).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const currentTime = new Date();
    const verificationCodeExpires = new Date(
      user.verificationCodeExpires
    ).getTime();
    console.log(currentTime, verificationCodeExpires);
    if (currentTime > verificationCodeExpires) {
      return res.status(500).json({
        success: false,
        message: "OTP has expired",
      });
    }
    user.accountVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save({ validateModifiedOnly: true });
    sendToken(user, 200, "User verified and registered successfully", res);
  } catch (error) {
    // return next(new ErrorHandler("Internal Server Error", 500));
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

const login = catchAsyncErrors (async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler("Please fill all the fields", 400));
  }

  const user = await User.findOne({ email, accountVerified: true }).select(
    "+password"
  );
  if (!user) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  const isPasswordMatched = await user.comparePassword(password);
  if (!isPasswordMatched) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  sendToken(user, 200, "Login successful", res);
});

const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

const getUser = catchAsyncErrors(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

const forgotPassword = catchAsyncErrors(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
    accountVerified: true,
  });

  if (!user) {
    res.status(500).json({
        success: true,
        message: "User not found.",
      });
  }
  const resetToken = user.generateResetPasswordToken();
  await user.save({ validateBeforeSave: false });
  const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

    const message = `Click here to reset password: ${resetPasswordUrl}`;
//   const message = `
//     <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
//     <table width="100%" cellspacing="0" cellpadding="0">
//       <tr>
//         <td align="center" style="padding: 40px 0;">
//           <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
//             <tr>
//               <td align="center" style="padding-bottom: 20px;">
//                 <h2 style="color: #333333;">Forgot Your Password?</h2>
//               </td>
//             </tr>
//             <tr>
//               <td style="color: #666666; font-size: 16px; padding-bottom: 30px;">
//                 We received a request to reset your password. Click the button below to set a new password.
//               </td>
//             </tr>
//             <tr>
//               <td align="center" style="padding-bottom: 30px;">
//                 <a href="${resetPasswordUrl}"
//                    style="background-color: #007bff; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-size: 16px;">
//                   Reset Password
//                 </a>
//               </td>
//             </tr>
//             <tr>
//               <td style="color: #999999; font-size: 14px;">
//                 If you didn’t request a password reset, you can safely ignore this email.
//               </td>
//             </tr>
//             <tr>
//               <td style="color: #cccccc; font-size: 12px; padding-top: 40px; text-align: center;">
//                 &copy; 2025 Your Company. All rights reserved.
//               </td>
//             </tr>
//           </table>
//         </td>
//       </tr>
//     </table>
//   </div>
//   `;
  try {
    sendEmail(user.email, "MERN AUTHENTICATION APP RESET PASSWORD", message);
    return res.status(200).json({
      success: true,
      message: `Email sent to ${user.email} successfully.`,
      token: resetPasswordUrl,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(500).json({
        success: false,
        message: error.message ? error.message : "Cannot send reset password token.",
    });
  }
});

const resetPassword = catchAsyncErrors(async (req, res, next) => {
    const { token } = req.params;
    console.log(token);
    
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

      console.log("resetPasswordToken:", resetPasswordToken);

    // const user = await User.findOne({
    //   email: `lalmastar12@gmail.com`,
    //   resetPasswordExpire: { $gt: Date.now() },
    // });
    const user = await User.findOne({token: token});
    console.log("user:", user); 

    // if (!user) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Reset password token is invalid or has been expired.",
    //   });
    // }

    // if (req.body.password !== req.body.confirmPassword) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Password & confirm password do not match.",
    //   });
    // }

    // user.password = req.body.password;
    // user.resetPasswordToken = undefined;
    // user.resetPasswordExpire = undefined;
    // await user.save();
    // sendToken(user, 200, "Reset Password Successfully.", res);
  });


module.exports = {register, sendVerificationCode, generateEmailTemplate, verifyOTP, login, logout, getUser, forgotPassword, resetPassword};