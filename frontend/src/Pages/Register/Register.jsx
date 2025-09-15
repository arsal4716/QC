import React, { useState } from 'react';
import { FaEnvelope, FaLock, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import InputField from '../../components/InputFields/InputField';
import AuthForm from '../../components/AuthForm/AuthForm';
import { useRegisterMutation } from '../../store/api/AuthApi';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Full name is required';
    }
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const response = await register({ name, email, password }).unwrap();
      
      if (response.success) {
        toast.success(response.message || 'Registered successfully! Please login.');
        navigate('/login', { 
          replace: true,
          state: { email } // Pre-fill email on login page
        });
      } else {
        toast.error(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.data?.message || 'Registration error');
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
            disabled={isLoading}
          />
          <InputField
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<FaEnvelope />}
            error={errors.email}
            disabled={isLoading}
          />
          <InputField
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<FaLock />}
            error={errors.password}
            disabled={isLoading}
            additionalIcon={
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                disabled={isLoading}
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
            disabled={isLoading}
            additionalIcon={
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="text-gray-500 hover:text-gray-700 focus:outline-none"
                disabled={isLoading}
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

export default React.memo(Register);