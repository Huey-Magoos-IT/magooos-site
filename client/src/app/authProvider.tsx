import React, { useEffect, useState } from "react";
import { Authenticator, ThemeProvider, Theme } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { Hub } from 'aws-amplify/utils';
import { useDispatch } from 'react-redux';
import Image from "next/image";
import { api } from '../state/api';
import "@aws-amplify/ui-react/styles.css";

// Amplify Configuration remains the same
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      userPoolClientId:
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "",
    },
  },
});

// A much simpler theme, we'll control most styling with Tailwind and CSS
const theme: Theme = {
  name: "hueys-minimal-theme",
  tokens: {
    colors: {
      brand: {
        primary: { '80': '#d97706' }, // Huey's Gold
      },
    },
    radii: { medium: '0.5rem' },
  },
};

// Image gallery for the brand showcase
const images = [
  "/p1.jpeg", "/p2.jpeg", "/p3.jpeg", "/p4.jpeg",
  "/p5.jpeg", "/p6.jpeg", "/p7.jpeg", "/p8.jpeg",
  "/p9.jpeg", "/p10.jpeg", "/p11.jpeg", "/p12.jpeg",
];

// The definitive AuthProvider Component
const AuthProvider = ({ children }: any) => {
  const dispatch = useDispatch();
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 5000);

    const hubListener = (data: any) => {
      if (data.payload.event === 'signedIn' || data.payload.event === 'signedOut') {
        dispatch(api.util.resetApiState());
      }
    };
    const unsubscribe = Hub.listen('auth', hubListener);

    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, [dispatch]);

  return (
    <Authenticator.Provider>
        <style jsx global>{`
            .amplify-button[data-variation="primary"] {
                background: linear-gradient(to right, #f59e0b, #d97706);
                color: white;
                border-radius: 0.5rem;
                font-weight: 600;
                padding: 0.75rem 0;
                transition: all 0.2s ease-in-out;
                border: none;
                box-shadow: 0 4px 15px 0 rgba(245, 158, 11, 0.4);
            }
            .amplify-button[data-variation="primary"]:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px 0 rgba(245, 158, 11, 0.5);
            }
            .amplify-button[data-variation="primary"]:active {
                transform: translateY(0);
            }
            .amplify-field-control {
                border-radius: 0.5rem;
                padding: 1.5rem 1rem;
                border: 1px solid #d1d5db;
                transition: all 0.2s ease-in-out;
            }
            .amplify-field-control:focus {
                border-color: #f59e0b;
                box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
            }
            .amplify-button[data-variation="link"] {
                color: #b45309;
                font-weight: 500;
            }
            .amplify-button[data-variation="link"]:hover {
                color: #92400e;
            }
            .amplify-tabs__item--active {
                border-color: #f59e0b;
                color: #f59e0b;
            }
        `}</style>
         <ThemeProvider theme={theme}>
            <Authenticator hideSignUp={true}>
              {({ user }) => {
                if (user) {
                  return children;
                }

                return (
                  <main className="grid grid-cols-1 lg:grid-cols-2 h-screen w-screen font-sans">
                    {/* Left Side: Brand Showcase */}
                    <div className="relative hidden lg:block">
                      {images.map((src, idx) => (
                        <Image
                          key={src}
                          src={src}
                          alt="Huey Magoo's Chicken Tenders"
                          layout="fill"
                          objectFit="cover"
                          className={`transition-opacity duration-1000 ${idx === currentImage ? "opacity-100" : "opacity-0"}`}
                          priority={idx === 0}
                        />
                      ))}
                      <div className="absolute inset-0 bg-black/50" />
                      <div className="absolute bottom-12 left-12 text-white p-4">
                        <h2
                          className="text-5xl font-extrabold"
                          style={{ textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}
                        >
                          The Filet Mignon of Chicken®
                        </h2>
                        <p
                          className="text-xl mt-3 max-w-lg"
                          style={{ textShadow: "1px 1px 4px rgba(0,0,0,0.8)" }}
                        >
                          Authentic Southern-style tenders, hand-breaded and made to order.
                        </p>
                      </div>
                    </div>

                    {/* Right Side: Login Form */}
                    <div className="flex flex-col items-center justify-center bg-gray-50 p-6 sm:p-8">
                       <div className="w-full max-w-xs space-y-8">
                         <div className="text-center">
                            <Image
                                src="/logo.png"
                                alt="Huey Magoo's Logo"
                                width={100}
                                height={100}
                                className="mx-auto mb-4"
                            />
                            <h1 className="text-3xl font-bold text-gray-900">
                                Huey Magoo&apos;s Portal
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Sign in to access corporate resources.
                            </p>
                         </div>
                         {/* Amplify's Sign In component is rendered here automatically */}
                         <Authenticator.SignIn />
                       </div>
                    </div>
                  </main>
                );
              }}
            </Authenticator>
         </ThemeProvider>
    </Authenticator.Provider>
  );
};

export default AuthProvider;
