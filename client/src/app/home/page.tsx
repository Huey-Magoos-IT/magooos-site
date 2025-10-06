"use client";

import React, { useEffect, useState } from 'react';
import { useGetAuthUserQuery } from '@/state/api';
import { BarChart, Briefcase, Users, Settings, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const HomePage = () => {
  const { data: currentUser } = useGetAuthUserQuery({});
  const userName = currentUser?.userDetails?.username || 'User';
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  const featureCards = [
    {
      icon: <BarChart className="h-8 w-8 text-blue-500 dark:text-blue-400" />,
      title: "View Analytics",
      description: "Dive into your data and gain valuable insights.",
      link: "/departments/data",
    },
    {
      icon: <Briefcase className="h-8 w-8 text-green-500 dark:text-green-400" />,
      title: "Manage Projects",
      description: "Keep track of all ongoing projects and tasks.",
      link: "/projects",
    },
    {
      icon: <Users className="h-8 w-8 text-purple-500 dark:text-purple-400" />,
      title: "Explore Teams",
      description: "Collaborate with your team members efficiently.",
      link: "/teams",
    },
    {
      icon: <Settings className="h-8 w-8 text-gray-500 dark:text-gray-400" />,
      title: "Adjust Settings",
      description: "Personalize your experience and preferences.",
      link: "/settings",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8 md:p-12 lg:p-16">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
            {greeting}, {userName}!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Welcome to your personalized dashboard. Here&apos;s a quick overview of what&apos;s happening.
          </p>
        </div>

        {/* Feature Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {featureCards.map((card, index) => (
            <Link href={card.link} key={index} className="block">
              <div
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2
                           border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center text-center h-full"
              >
                <div className="mb-4 p-3 rounded-full bg-blue-50 dark:bg-gray-700">
                  {card.icon}
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">
                  {card.title}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-sm flex-grow">
                  {card.description}
                </p>
                <div className="mt-4 text-blue-600 dark:text-blue-400 flex items-center group">
                  Learn More
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions/Updates Section (Placeholder) */}
        <div className="mt-20 text-center animate-fade-in-up delay-200">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Your Daily Snapshot
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 max-w-3xl mx-auto">
            <p className="text-gray-700 dark:text-gray-300 text-lg">
              No new updates or urgent actions for today. Everything looks good!
            </p>
            <button className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all duration-300 transform hover:scale-105">
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
