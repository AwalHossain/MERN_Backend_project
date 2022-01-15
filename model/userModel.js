const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your Name"],
      maxlength: [30, "Name cannot exceed 30 character"],
      minlength: [4, "Name should have more than 4 character"],
    },
    email: {
      type: String,
      required: [true, "Please enter you email"],
      unique: true,
      validate: [validator.isEmail, "please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Enter your password"],
      minlength: [6, "password should be six character long"],
      select: false,
    },
    avatar: {
      public_id: {
        type: String,
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
    },
    role: {
      type: String,
      default: "user",
    },

    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  this.password = await bcrypt.hash(this.password, 10);
});
//Jwt token

userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

//Compare password

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

//Reset Password

userSchema.methods.getResetPasswordToken = function () {
  //Generating Token
  const resetToken = crypto.randomBytes(20).toString("hex");
  //hasing and add to the userSchema
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpire = Date.now() + 15 * 60 * 100;

  return resetToken;
};

module.exports = mongoose.model("users", userSchema);
