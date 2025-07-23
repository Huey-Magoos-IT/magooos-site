import React, { useEffect } from "react";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
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

const components = {
  Header() {
    return (
      <div className="flex justify-center mb-5">
        <Image src="/logo.png" alt="Logo" width={100} height={100} />
      </div>
    );
  },
};

const AuthProvider = ({ children }: any) => {
  const dispatch = useDispatch();
  const { authStatus } = useAuthenticator(context => [context.authStatus]);

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

  // Render children directly if authenticated
  if (authStatus === 'authenticated') {
    return <>{children}</>;
  }

  // Render a full-page login UI if not authenticated
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <Authenticator hideSignUp={true} components={components}>
          {/* This part won't be rendered due to the check above, but it's required by Authenticator */}
        </Authenticator>
      </div>
    </div>
  );
};

export default AuthProvider;
