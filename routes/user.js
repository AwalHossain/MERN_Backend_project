const router = require("express").Router();
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const User = require("../model/userModel");
const sendToken = require("../utils/jwtToken");
const { isAuthenticatedUser, authrizeRoles } = require("../middleware/auth");
const sendEmail = require("../middleware/sendEmail");
const crypto = require("crypto");

router.post(
  "/registerUser",
  catchAsyncErrors(async (req, res, next) => {
    const { name, email, password } = req.body;
    const user = await User.create({
      name,
      email,
      password,
      avatar: {
        public_id: "this is simple id",
        url: "profileUrl",
      },
    });
    sendToken(user, 201, res);
  })
);

// Login user
router.post(
  "/login",
  catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // checking if user has given password and email both

    if (!email || !password) {
      return next(new ErrorHandler("Please Enter Email & Password", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorHandler("Invalid email or password", 401));
    }

    const isPasswordMatched = await user.comparePassword(password);

    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid  password", 401));
    }

    sendToken(user, 200, res);
  })
);

// logOut user

router.get(
  "/logout",
  isAuthenticatedUser,
  catchAsyncErrors(async (req, res, next) => {
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });
    res.status(200).json({
      success: true,
      message: "Logged Out",
    });
  })
);

// Forgot Password

router.post(
  "/password/forgot",
  catchAsyncErrors(async (req, res, next) => {
    const user = await User.findOne({
      email: req.body.email,
    });
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    //Get ResetPassword Token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/password/reset/${resetToken}`;

    const message = `Your password reset token is:- \n\n ${resetPasswordUrl} \n\n If you have not requested this mail then, Please ignore it`;

    try {
      await sendEmail({
        email: user.email,
        subject: `Ecommerce Password recovery `,
        message,
      });

      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email} sucessfully`,
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// reset password
router.put(
  "/password/reset/:token",
  catchAsyncErrors(async (req, res, next) => {
    // creating token hash
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(
        new ErrorHandler("Reset password token is invalid or expired", 400)
      );
    }

    if (req.body.password !== req.body.confirmPassword) {
      return next(new ErrorHandler("Password is not matching", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    sendToken(user, 200, res);
  })
);

// Get user details

router.get(
  "/me",
  isAuthenticatedUser,
  catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  })
);

// Update user Password

router.put(
  "/password/update",
  isAuthenticatedUser,
  catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.user.id).select("+password");
    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);
    if (!isPasswordMatched) {
      return next(new ErrorHandler("You old password is not correct", 401));
    }
    if (req.body.newPassword !== req.body.confirmPassword) {
      return next(new ErrorHandler("Passwrod doesn't match", 401));
    }
    user.password = req.body.newPassword;

    await user.save();

    sendToken(user, 200, res);
  })
);

// Update user Profile
router.put(
  "/me/update",
  isAuthenticatedUser,
  catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
      name: req.body.name,
      email: req.body.email,
    };

    const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    res.status(200).json({
      success: true,
      user,
    });
  })
);

// Get All User -Admin
router.get(
  "/admin/users",
  isAuthenticatedUser,
  authrizeRoles("admin"),
  catchAsyncErrors(async (req, res, next) => {
    console.log("helo");
    console.log("hesdaffdflo");
    const users = await User.find();

    if (!users) {
      return next(new ErrorHandler("Users not found", 404));
    }

    res.status(200).json({
      success: true,
      users,
    });
  })
);

//  Get single user -- Admin

router.get(
  "/admin/singleUser/:id",
  isAuthenticatedUser,
  authrizeRoles("admin"),
  catchAsyncErrors(async (req, res, err) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }
    res.status(200).json({
      success: true,
      user,
    });
  })
);

// update userRole

router.put(
  "/admin/updateRole/:id",
  isAuthenticatedUser,
  authrizeRoles("admin"),
  catchAsyncErrors(async (req, res, err) => {
    const updateRole = {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
    };

    await User.findByIdAndUpdate(req.params.id, updateRole, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    res.status(200).json({
      success: true,
      message: "User added as admin",
    });
  })
);

// Delete user - Admin

router.get(
  "/admin/deleteUser/:id",
  catchAsyncErrors(async (req, res, next) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new ErrorHandler("Users not found", 404));
    }

    await user.remove();

    res.status(200).json({
      success: true,
      message: "User Successfully delete",
    });
  })
);

module.exports = router;
