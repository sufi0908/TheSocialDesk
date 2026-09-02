import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/forms/Input';
import { Checkbox } from '../../components/forms/Checkbox';
import { Button } from '../../components/ui/Button';
import { ROLES, ROLE_LABELS, getRoleRedirectPath } from '../../utils/constants';
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Validation & Error States
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, loading, role } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(getRoleRedirectPath(role), { replace: true });
    }
  }, [isAuthenticated, loading, role, navigate]);

  const validateForm = () => {
    const newErrors = {};
    if (!email) {
      newErrors.email = 'Email address is required.';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setGeneralError('');

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const loggedUser = await login(email, password);
      const targetPath = getRoleRedirectPath(loggedUser.role);
      navigate(targetPath);
    } catch (err) {
      setGeneralError(err.message || 'Invalid email or password. Please check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign in to SocialDesk</h2>
        <p className="text-xs text-slate-500 mt-1">Enter your agency credentials to access your workspace.</p>
      </div>

      {/* General Error Alert Box */}
      {generalError && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors({ ...errors, email: null });
          }}
          error={errors.email}
          leftIcon={Mail}
          placeholder="name@agency.com"
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: null });
          }}
          error={errors.password}
          leftIcon={Lock}
          rightIcon={() => (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-hidden"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          placeholder="••••••••••••"
        />

        <div className="flex items-center justify-between text-xs">
          <Checkbox
            label="Remember me"
            checked={rememberMe}
            onChange={(checked) => setRememberMe(checked)}
          />
          <Link to="/forgot-password" className="text-indigo-600 hover:text-indigo-700 font-semibold">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full py-2.5"
          isLoading={isSubmitting}
          rightIcon={ArrowRight}
        >
          Sign In to Workspace
        </Button>
      </form>
    </div>
  );
};
