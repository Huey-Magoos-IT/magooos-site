import React, { useEffect } from "react";
import { Authenticator, ThemeProvider, Theme } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { Hub } from 'aws-amplify/utils';
import { useDispatch } from 'react-redux';
import { api } from '../state/api';
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
  signIn: {
    username: {
      placeholder: "Enter your username",
      label: "Username",
      inputProps: { required: true },
    },
    password: {
      placeholder: "Enter your password",
      label: "Password",
      inputProps: { type: "password", required: true },
    },
  },
};

const customTheme: Theme = {
  name: 'custom-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: '#eff6ff',
          20: '#dbeafe',
          40: '#93c5fd',
          60: '#60a5fa',
          80: '#3b82f6',
          90: '#2563eb',
          100: '#1d4ed8',
        },
      },
    },
    components: {
      button: {
        primary: {
          backgroundColor: '{colors.brand.primary.80}',
          color: '#ffffff',
          _hover: {
            backgroundColor: '{colors.brand.primary.90}',
          },
          _focus: {
            backgroundColor: '{colors.brand.primary.90}',
          },
          _active: {
            backgroundColor: '{colors.brand.primary.100}',
          },
        },
        link: {
          color: '{colors.brand.primary.80}',
          _hover: {
            color: '{colors.brand.primary.90}',
          },
        },
      },
      fieldcontrol: {
        borderColor: '#e5e7eb',
        _focus: {
          borderColor: '{colors.brand.primary.80}',
        },
        _error: {
          borderColor: '#ef4444',
        },
      },
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-dark-bg dark:via-dark-secondary dark:to-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Sign in to access your management portal
          </p>
        </div>

        <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow-2xl border border-gray-200 dark:border-stroke-dark p-8">
          <ThemeProvider theme={customTheme}>
            <Authenticator
              hideSignUp={true}
              formFields={formFields}
              components={{
                Header() {
                  return null;
                },
              }}
            >
              {({ user }) =>
                user ? (
                  <div>{children}</div>
                ) : (
                  <div></div>
                )
              }
            </Authenticator>
          </ThemeProvider>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Secure access to your business tools
          </p>
        </div>
      </div>

      {/* Custom CSS for additional styling */}
      <style jsx global>{`
        .amplify-authenticator {
          --amplify-components-authenticator-router-border-radius: 1rem;
          --amplify-components-button-primary-background-color: #3b82f6;
          --amplify-components-button-primary-hover-background-color: #2563eb;
          --amplify-components-button-primary-focus-background-color: #2563eb;
          --amplify-components-button-primary-active-background-color: #1d4ed8;
          --amplify-components-fieldcontrol-border-radius: 0.5rem;
          --amplify-components-fieldcontrol-focus-border-color: #3b82f6;
          --amplify-components-fieldcontrol-focus-box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
          --amplify-components-button-primary-border-radius: 0.5rem;
          --amplify-components-button-primary-font-weight: 600;
          --amplify-components-button-link-color: #3b82f6;
          --amplify-components-button-link-hover-color: #2563eb;
        }
        
        .amplify-button[data-variation="primary"] {
          transition: all 0.2s ease-in-out;
        }
        
        .amplify-button[data-variation="primary"]:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }
        
        .amplify-button[data-variation="primary"]:active {
          transform: translateY(0);
        }
        
        .amplify-field-control {
          transition: all 0.2s ease-in-out;
        }
        
        .amplify-authenticator__form {
          gap: 1.5rem;
        }
        
        .amplify-field {
          margin-bottom: 1rem;
        }
        
        .amplify-button[data-variation="link"] {
          font-weight: 500;
          text-decoration: none;
        }
        
        .amplify-button[data-variation="link"]:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default AuthProvider;
