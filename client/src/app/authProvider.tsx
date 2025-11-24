import React, { createContext, useContext, useEffect, useState } from "react";
import { Amplify } from "aws-amplify";
import { signIn, getCurrentUser, resetPassword, confirmResetPassword, confirmSignIn } from "aws-amplify/auth";
import { Hub } from 'aws-amplify/utils';
import { useDispatch } from 'react-redux';
import { api } from '../state/api';
import { useRouter } from 'next/navigation';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      userPoolClientId:
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "",
    },
  },
});

interface AuthContextType {
  isAuthenticated: boolean | null;
  username: string;
  setUsername: (username: string) => void;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  isLoading: boolean;
  error: string;
  authView: string;
  setAuthView: (view: string) => void;
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
  confirmationCode: string;
  setConfirmationCode: (code: string) => void;
  handleSignIn: (e: React.FormEvent) => Promise<void>;
  handleNewPasswordRequired: (e: React.FormEvent) => Promise<void>;
  handleForgotPassword: (e: React.FormEvent) => Promise<void>;
  handleConfirmResetPassword: (e: React.FormEvent) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }: any) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [authView, setAuthView] = useState('signIn');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        await getCurrentUser();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuthState();

    const listener = (data: any) => {
      switch (data.payload.event) {
        case 'signedIn':
          console.log('User signed in, resetting API state.');
          dispatch(api.util.resetApiState());
          // Delay auth state change to allow API reset to complete
          setTimeout(() => {
            setIsAuthenticated(true);
            router.push('/home');
          }, 100);
          break;
        case 'signedOut':
          console.log('User signed out, resetting API state.');
          dispatch(api.util.resetApiState());
          setIsAuthenticated(false);
          break;
      }
    };

    const unsubscribe = Hub.listen('auth', listener);
    return () => unsubscribe();
  }, [dispatch, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { nextStep } = await signIn({ username, password });
      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setAuthView('newPasswordRequired');
      }
      // Note: Auth state will be updated by the Hub listener
    } catch (error: any) {
      console.error('Error signing in:', error);
      setError(error.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordRequired = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      await confirmSignIn({ challengeResponse: newPassword });
      // Note: Auth state will be updated by the Hub listener
    } catch (error: any) {
      console.error('Error setting new password:', error);
      setError(error.message || 'Failed to set new password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await resetPassword({ username });
      setAuthView('confirmResetPassword');
    } catch (error: any) {
      console.error('Error sending password reset code:', error);
      setError(error.message || 'Failed to send password reset code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await confirmResetPassword({ username, confirmationCode, newPassword });
      setAuthView('signIn');
      setPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isAuthenticated,
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
  };

  // Always render children - no conditional rendering
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
