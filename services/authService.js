const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { success, error } = require("../utils/apiResponse");
exports.register = async ({ name, email, password }) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const role = email === "fsinta@gmail.com" ? "admin" : "user";
  const user = await User.create({ name, email, password: hashedPassword, role });
  return user;
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email or password");
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error("Invalid email or password");
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  return { token, user };
};
