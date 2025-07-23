import React, { useEffect } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { Hub } from 'aws-amplify/utils'; // Import Hub
import { useDispatch } from 'react-redux'; // Import useDispatch
import { api } from '../state/api'; // Import your api slice
import "@aws-amplify/ui-react/styles.css";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      userPoolClientId:
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "",
    },
  },
});

const formFields = {
  signUp: {
    username: {
      order: 1,
      placeholder: "Choose a username",
      label: "Username",
      inputProps: { required: true },
    },
    email: {
      order: 1,
      placeholder: "Enter your email address",
      label: "Email",
      inputProps: { type: "email", required: true },
    },
    password: {
      order: 3,
      placeholder: "Enter your password",
      label: "Password",
      inputProps: { type: "password", required: true },
    },
    confirm_password: {
      order: 4,
      placeholder: "Confirm your password",
      label: "Confirm Password",
      inputProps: { type: "password", required: true },
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
        // Add other auth events if needed
      }
    };

    // Listen for auth events
    const unsubscribe = Hub.listen('auth', listener);

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [dispatch]); // Dependency array includes dispatch

  return (
    <div>
      <Authenticator hideSignUp={true} formFields={formFields}>
        {({ user }: any) =>
          user ? (
            <div>{children}</div>
          ) : (
            <div>
              <h1>Please sign in below:</h1>
            </div>
          )
        }
      </Authenticator>
    </div>
  );
};

export default AuthProvider;
