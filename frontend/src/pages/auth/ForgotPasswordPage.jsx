import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/forms/Input';
import { Button } from '../../components/ui/Button';
import { Mail, ArrowLeft, CheckCircle2, Send } from 'lucide-react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { requestPasswordReset } = useAuth();

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(email);
      setIsSubmitted(true);
    } catch (err) {
      setError('Failed to send reset instructions. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Reset Your Password</h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter the email address associated with your SocialDesk account and we’ll send you a password reset link.
        </p>
      </div>

      {isSubmitted ? (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-200">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-emerald-950">Password Reset Email Sent!</h3>
          <p className="text-xs text-emerald-700 leading-relaxed">
            We’ve sent reset instructions to <span className="font-semibold">{email}</span>. Please check your inbox and follow the link.
          </p>
          <div className="pt-2">
            <Link to="/login">
              <Button variant="outline" size="sm" className="bg-white border-emerald-200 text-emerald-800">
                Return to Login
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleResetRequest} className="space-y-4">
          <Input
            label="Work Email Address"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            error={error}
            leftIcon={Mail}
            placeholder="alex@agency.com"
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full py-2.5"
            isLoading={isSubmitting}
            rightIcon={Send}
          >
            Send Reset Instructions
          </Button>
        </form>
      )}
    </div>
  );
};
