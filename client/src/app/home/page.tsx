"use client";

import React, { useEffect, useState } from 'react';
import { useGetAuthUserQuery } from '@/state/api';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Activity, 
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

const HomePage = () => {
  const { data: currentUser } = useGetAuthUserQuery({});
  const userName = currentUser?.userDetails?.username || 'User';
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Set greeting based on time
      if (hour < 12) {
        setGreeting('Good Morning');
      } else if (hour < 18) {
        setGreeting('Good Afternoon');
      } else {
        setGreeting('Good Evening');
      }
      
      // Set current time
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const quickStats = [
    {
      label: "Active Tasks",
      value: "12",
      change: "+3",
      trend: "up",
      icon: CheckCircle2,
      color: "emerald"
    },
    {
      label: "Team Members",
      value: "24",
      change: "+2",
      trend: "up",
      icon: Users,
      color: "blue"
    },
    {
      label: "Reports Generated",
      value: "156",
      change: "+12",
      trend: "up",
      icon: BarChart3,
      color: "purple"
    },
    {
      label: "System Status",
      value: "Healthy",
      change: "100%",
      trend: "stable",
      icon: Activity,
      color: "cyan"
    },
  ];

  const recentActivity = [
    {
      action: "New report generated",
      description: "Loyalty scan report for Store #123",
      time: "2 minutes ago",
      type: "success"
    },
    {
      action: "User added",
      description: "John Doe joined the team",
      time: "1 hour ago",
      type: "info"
    },
    {
      action: "Alert resolved",
      description: "Price discrepancy at Location #456",
      time: "3 hours ago",
      type: "warning"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 
                    dark:from-dark-bg dark:via-dark-secondary/50 dark:to-dark-tertiary/30 
                    p-6 md:p-8 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl 
                      bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700
                      shadow-2xl shadow-blue-500/20">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
                  <h1 className="text-4xl md:text-5xl font-bold text-white">
                    {greeting}, {userName}!
                  </h1>
                </div>
                <p className="text-xl text-blue-100 max-w-2xl">
                  Welcome back to your dashboard. Here&apos;s what&apos;s happening today.
                </p>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 text-white/90">
                  <Clock className="h-5 w-5" />
                  <span className="text-lg font-medium">{currentTime}</span>
                </div>
                <div className="text-sm text-blue-200">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            const colorClasses = {
              emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
              blue: "from-blue-500 to-cyan-600 shadow-blue-500/20",
              purple: "from-purple-500 to-pink-600 shadow-purple-500/20",
              cyan: "from-cyan-500 to-blue-600 shadow-cyan-500/20"
            }[stat.color];

            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl bg-white dark:bg-dark-secondary
                         border border-gray-200/50 dark:border-gray-700/50
                         shadow-lg hover:shadow-2xl
                         transition-all duration-300 hover:-translate-y-1
                         animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Gradient Accent */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colorClasses}`} />
                
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses} shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold
                                   ${stat.trend === 'up' 
                                     ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                     : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                   }`}>
                      {stat.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                      {stat.change}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                </div>

                {/* Hover Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-500/5 
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-dark-secondary rounded-2xl 
                          border border-gray-200/50 dark:border-gray-700/50
                          shadow-lg p-6 animate-fade-in-up"
                 style={{ animationDelay: '400ms' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Recent Activity
                </h2>
                <Link 
                  href="/activity" 
                  className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium
                           flex items-center gap-1 group">
                  View All
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="space-y-4">
                {recentActivity.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-xl
                             bg-gray-50 dark:bg-dark-tertiary
                             border border-gray-100 dark:border-gray-700/50
                             hover:shadow-md transition-all duration-200
                             group cursor-pointer">
                    <div className={`mt-1 p-2 rounded-lg flex-shrink-0
                                   ${item.type === 'success' 
                                     ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                                     : item.type === 'warning'
                                     ? 'bg-amber-100 dark:bg-amber-900/30'
                                     : 'bg-blue-100 dark:bg-blue-900/30'
                                   }`}>
                      {item.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                      {item.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
                      {item.type === 'info' && <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">
                        {item.action}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {item.description}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        {item.time}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 
                                         group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-dark-secondary rounded-2xl 
                          border border-gray-200/50 dark:border-gray-700/50
                          shadow-lg p-6 animate-fade-in-up"
                 style={{ animationDelay: '500ms' }}>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Quick Actions
              </h2>

              <div className="space-y-3">
                {[
                  { label: "View Reports", href: "/departments/reporting", color: "blue" },
                  { label: "Manage Teams", href: "/teams", color: "purple" },
                  { label: "Price Portal", href: "/departments/price-portal", color: "cyan" },
                  { label: "User Settings", href: "/settings", color: "gray" },
                ].map((action, index) => (
                  <Link
                    key={index}
                    href={action.href}
                    className={`flex items-center justify-between p-4 rounded-xl
                             border-2 border-${action.color}-200 dark:border-${action.color}-800/50
                             bg-${action.color}-50/50 dark:bg-${action.color}-900/10
                             hover:bg-${action.color}-100 dark:hover:bg-${action.color}-900/20
                             hover:border-${action.color}-300 dark:hover:border-${action.color}-700
                             shadow-sm hover:shadow-md
                             transition-all duration-200
                             group`}>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {action.label}
                    </span>
                    <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-500 
                                         group-hover:translate-x-1 group-hover:text-blue-600 
                                         dark:group-hover:text-blue-400
                                         transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
