import React, { useState } from "react";
import { FaEnvelope, FaLock, FaUser, FaEye, FaEyeSlash } from "react-icons/fa";
import InputField from "../components/InputField";
import AuthForm from "../components/AuthForm";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/AuthApi";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = "Full name is required";
    }
    
    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }
    
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleRegister = async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  setIsLoading(true);
  try {
    const res = await register({ name, email, password });
    if (res.success) {
      toast.success(res.message || "Registered successfully! Please login.");
      navigate("/login");
    } else {
      toast.error(res.message || "Registration failed");
    }
  } catch (err) {
    console.error("Registration error:", err);
    toast.error(err.message || "Registration error");
  } finally {
    setIsLoading(false);
  }
};

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <AuthForm
      title="Create Account"
      onSubmit={handleRegister}
      buttonText={isLoading ? "Creating Account..." : "Register Now"}
      isButtonDisabled={isLoading}
      fields={
        <>
          <InputField
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<FaUser />}
            error={errors.name}
          />
          <InputField
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<FaEnvelope />}
            error={errors.email}
          />
          <InputField
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<FaLock />}
            error={errors.password}
            additionalIcon={
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            }
          />
          <InputField
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<FaLock />}
            error={errors.confirmPassword}
            additionalIcon={
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            }
          />
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Login here
              </Link>
            </p>
          </div>
        </>
      }
    />
  );
};

export default Register;