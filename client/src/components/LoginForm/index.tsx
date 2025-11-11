import React from 'react';
import Image from 'next/image';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '@/app/authProvider';

const LoginForm = () => {
  const {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    isLoading,
    error,
    authView,
    setAuthView,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    confirmationCode,
    setConfirmationCode,
    handleSignIn,
    handleNewPasswordRequired,
    handleForgotPassword,
    handleConfirmResetPassword,
  } = useAuth();

  const renderSignInForm = () => (
    <form onSubmit={handleSignIn} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
          Username
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 dark:bg-dark-tertiary text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            placeholder="Enter your username"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-12 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 dark:bg-dark-tertiary text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-glow-orange"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Signing In...
          </div>
        ) : (
          'Sign In'
        )}
      </button>
      <div className="text-center">
        <button type="button" onClick={() => setAuthView('forgotPassword')} className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline transition-colors">
          Reset Password
        </button>
      </div>
    </form>
  );

  const renderNewPasswordRequiredForm = () => (
    <form onSubmit={handleNewPasswordRequired} className="space-y-6">
      <h3 className="text-xl font-bold text-center">Set a New Password</h3>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
          New Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full pl-12 pr-12 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 dark:bg-dark-tertiary text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            placeholder="Enter your new password"
            required
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
          Confirm New Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 dark:bg-dark-tertiary text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
            placeholder="Confirm your new password"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-glow-orange disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Setting Password...' : 'Set New Password'}
      </button>
    </form>
  );

  const renderForgotPasswordForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-6">
      <h3 className="text-xl font-bold text-center">Password Reset</h3>
      {error && <p className="text-red-500 text-center">{error}</p>}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
          Username
        </label>
        <div className="relative">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-4 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 dark:bg-dark-tertiary text-gray-900 dark:text-white"
            placeholder="Enter your username"
            required
          />
        </div>
      </div>
      <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-glow-orange disabled:opacity-50 disabled:cursor-not-allowed">
        {isLoading ? 'Sending Code...' : 'Send Password Reset Code'}
      </button>
      <div className="text-center">
        <button type="button" onClick={() => setAuthView('signIn')} className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline transition-colors">
          Back to Sign In
        </button>
      </div>
    </form>
  );

  const renderConfirmResetPasswordForm = () => (
    <form onSubmit={handleConfirmResetPassword} className="space-y-6">
      <h3 className="text-xl font-bold text-center">Confirm Password Reset</h3>
      {error && <p className="text-red-500 text-center">{error}</p>}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
          Confirmation Code
        </label>
        <div className="relative">
          <input
            type="text"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
            className="w-full pl-4 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 dark:bg-dark-tertiary text-gray-900 dark:text-white"
            placeholder="Enter code from your email"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
          New Password
        </label>
        <div className="relative">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full pl-4 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 dark:bg-dark-tertiary text-gray-900 dark:text-white"
            placeholder="Enter new password"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
          Confirm New Password
        </label>
        <div className="relative">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pl-4 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 dark:bg-dark-tertiary text-gray-900 dark:text-white"
            placeholder="Confirm new password"
            required
          />
        </div>
      </div>
      <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-glow-orange disabled:opacity-50 disabled:cursor-not-allowed">
        {isLoading ? 'Resetting Password...' : 'Reset Password'}
      </button>
      <div className="text-center">
        <button type="button" onClick={() => setAuthView('signIn')} className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline transition-colors">
          Back to Sign In
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-cream-100 to-gold-50 dark:from-dark-bg dark:via-dark-secondary dark:to-dark-tertiary flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-noise opacity-30"></div>

      <div className="relative w-full max-w-md">
        <div className="bg-white dark:bg-dark-secondary rounded-3xl shadow-lift-lg border border-orange-100 dark:border-orange-900/30 overflow-hidden backdrop-blur-sm">
          <div className="bg-gradient-orange-red px-8 py-12 text-center relative overflow-hidden">
            <div className="flex justify-center mb-6">
              <div className="bg-white rounded-2xl p-4 shadow-lg">
                <Image
                  src="https://huey-site-images.s3.us-east-2.amazonaws.com/g_with_tm_black-01.png"
                  alt="Huey Magoo's Logo"
                  width={60}
                  height={60}
                  className="object-contain"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2 relative z-10">
              Huey Magoo&apos;s Portal
            </h1>
            <p className="text-white/90 text-lg relative z-10">
              Access Your Dashboard
            </p>
          </div>

          <div className="px-8 py-8">
            {authView === 'signIn' && renderSignInForm()}
            {authView === 'newPasswordRequired' && renderNewPasswordRequiredForm()}
            {authView === 'forgotPassword' && renderForgotPasswordForm()}
            {authView === 'confirmResetPassword' && renderConfirmResetPasswordForm()}
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © 2025 Huey Magoo&apos;s. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
