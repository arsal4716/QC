import React, { useState } from "react";
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import {useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import AuthForm from "../../components/AuthForm/AuthForm";
import { useLoginMutation } from "../../store/api/AuthApi";
import { selectAuthLoading } from "../../store/slices/authSlice";
import InputField from "./../../components/InputFields/InputField";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();
  const [loginMutation, { isLoading }] = useLoginMutation();
  const authLoading = useSelector(selectAuthLoading);
  const { login } = useAuth();

  const validateForm = () => {
    const newErrors = {};
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await loginMutation({ email, password }).unwrap();

      if (response.success) {
        const { token, user, message } = response.data;
        login(token, user);

        toast.success(message || "Login successful.");
        navigate("/reporting", { replace: true });
      } else {
        toast.error(response.message || "Login failed");
      }
    } catch (error) {
      console.error("Login Failed:", error);
      toast.error(error.data?.message || "Login failed!");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <AuthForm
      title="Welcome Back!"
      onSubmit={handleLogin}
      buttonText={isLoading || authLoading ? "Logging in..." : "Login Now"}
      isButtonDisabled={isLoading || authLoading}
      fields={
        <>
          <InputField
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<FaEnvelope />}
            error={errors.email}
            disabled={isLoading || authLoading}
          />
          <InputField
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<FaLock />}
            error={errors.password}
            disabled={isLoading || authLoading}
            additionalIcon={
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                disabled={isLoading || authLoading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            }
          />
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </>
      }
    />
  );
};

export default React.memo(Login);
