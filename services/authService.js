const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { success, error } = require("../utils/apiResponse");
exports.register = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return { success: false, message: "Email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const role = email === "fsinta@gmail.com" ? "admin" : "user";

  const user = await User.create({ name, email, password: hashedPassword, role });
  
  return { success: true, message: "Registered successfully", user };
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    
    return res.json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again."
    });
  }
};