import React, { useEffect } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { Hub } from 'aws-amplify/utils';
import { useDispatch } from 'react-redux';
import { api } from '../state/api';
import "@aws-amplify/ui-react/styles.css";
import Image from 'next/image';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      userPoolClientId:
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "",
    },
  },
});

const customComponents = {
  Root({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 mx-auto bg-white rounded-2xl shadow-xl dark:bg-gray-800">
          {children}
        </div>
      </div>
    );
  },
  Header() {
    return (
      <div className="flex justify-center mb-6">
        <Image src="/logo.png" alt="Logo" width={120} height={120} />
      </div>
    );
  },
  SignIn: {
    Header() {
      return (
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Access Your Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Please sign in to continue.
          </p>
        </header>
      );
    },
  },
};

const AuthProvider = ({ children }: any) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const listener = (data: any) => {
      switch (data.payload.event) {
        case 'signedIn':
          console.log('User signed in, resetting API state.');
          dispatch(api.util.resetApiState());
          break;
        case 'signedOut':
          console.log('User signed out, resetting API state.');
          dispatch(api.util.resetApiState());
          break;
      }
    };

    const unsubscribe = Hub.listen('auth', listener);
    return () => unsubscribe();
  }, [dispatch]);

  return (
    <Authenticator hideSignUp={true} components={customComponents}>
      {({ signOut, user }) => (
        <>{children}</>
      )}
    </Authenticator>
  );
};

export default AuthProvider;
