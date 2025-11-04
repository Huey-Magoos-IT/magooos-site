"use client";

import React, { useEffect, useState } from 'react';
import { useGetAuthUserQuery } from '@/state/api';
import { 
  TrendingUp,
  Users,
  FileText,
  Zap,
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  Flame
} from 'lucide-react';
import Link from 'next/link';

const HomePage = () => {
  const { data: currentUser } = useGetAuthUserQuery({});
  const userName = currentUser?.userDetails?.username || 'Friend';
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
      
      setCurrentTime(new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
    };
    
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: "Active Users", value: "127", icon: Users, color: "orange" },
    { label: "Reports Today", value: "42", icon: FileText, color: "red" },
    { label: "System Status", value: "Healthy", icon: Activity, color: "green" },
  ];

  return (
    <div className="min-h-screen bg-cream-100 dark:bg-dark-bg">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 bg-gold-400 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-40 w-48 h-48 bg-red-400 rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex-1 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <Flame className="h-10 w-10 text-gold-400 animate-pulse" />
                <span className="text-gold-300 font-semibold text-sm uppercase tracking-wider">
                  Welcome Back
                </span>
              </div>
              <h1 className="text-hero text-white mb-4 text-shadow-lg">
                {greeting},<br/>{userName}!
              </h1>
              <p className="text-2xl text-orange-100 max-w-2xl mb-8">
                Your command center for all things Huey Magoo&apos;s.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/departments/reporting">
                  <button className="px-8 py-4 bg-white text-orange-600 font-bold rounded-2xl
                                   shadow-lift hover:shadow-lift-lg transition-all duration-300
                                   hover:scale-105 flex items-center gap-2 group">
                    View Reports
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/teams">
                  <button className="px-8 py-4 bg-orange-700/30 backdrop-blur text-white font-bold rounded-2xl
                                   border-2 border-white/30 hover:bg-orange-700/50
                                   transition-all duration-300 hover:scale-105">
                    Manage Teams
                  </button>
                </Link>
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20
                          animate-fade-in-up" style={{animationDelay: '200ms'}}>
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-gold-300" />
                <span className="text-white/80 text-sm">Current Time</span>
              </div>
              <div className="text-4xl font-bold text-white mb-1">{currentTime}</div>
              <div className="text-orange-200 text-sm">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-6 -mt-12 relative z-10 mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            const colorClasses = {
              orange: "from-orange-500 to-red-500 dark:from-orange-pastel dark:to-red-pastel shadow-glow-orange",
              red: "from-red-500 to-red-600 dark:from-red-pastel dark:to-red-pastel shadow-glow-red",
              green: "from-green-500 to-emerald-600"
            }[stat.color];

            return (
              <div
                key={index}
                className="bg-white dark:bg-dark-secondary rounded-2xl p-6 card-lift
                         border border-orange-200/30 dark:border-orange-500/20
                         card-textured animate-scale-in"
                style={{animationDelay: `${index * 100}ms`}}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-4xl font-black text-charcoal-900 dark:text-cream-100 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-charcoal-600 dark:text-charcoal-400">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bento Grid Section */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Large Feature Card */}
          <div className="md:col-span-2 md:row-span-2
                        bg-gradient-to-br from-orange-500 to-red-500 dark:from-orange-pastel/40 dark:to-red-pastel/40
                        rounded-3xl p-8 card-lift overflow-hidden relative
                        animate-fade-in-up">
            <div className="absolute inset-0 diagonal-stripes opacity-20" />
            <div className="relative z-10">
              <Zap className="h-12 w-12 text-gold-300 mb-4" />
              <h2 className="text-display text-white mb-4">
                Quick Actions
              </h2>
              <p className="text-xl text-orange-100 mb-8 max-w-md">
                Jump right into your most important tasks.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Data Portal", href: "/departments/data", icon: FileText },
                  { label: "Price Portal", href: "/departments/price-portal", icon: TrendingUp },
                  { label: "Teams", href: "/teams", icon: Users },
                  { label: "Reports", href: "/departments/reporting", icon: Activity },
                ].map((action, i) => {
                  const ActionIcon = action.icon;
                  return (
                    <Link key={i} href={action.href}>
                      <div className="bg-white/10 backdrop-blur hover:bg-white/20
                                    rounded-xl p-4 border border-white/20
                                    transition-all duration-300 hover:scale-105
                                    group cursor-pointer">
                        <ActionIcon className="h-6 w-6 text-white mb-2" />
                        <div className="text-white font-semibold flex items-center justify-between">
                          {action.label}
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-dark-secondary rounded-3xl p-6 card-lift
                        border border-orange-200/30 dark:border-orange-500/20
                        card-textured animate-fade-in-up"
               style={{animationDelay: '300ms'}}>
            <h3 className="text-xl font-bold text-charcoal-900 dark:text-cream-100 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[
                { text: "Report generated", time: "2m ago", status: "success" },
                { text: "User added", time: "1h ago", status: "info" },
                { text: "Data synced", time: "3h ago", status: "success" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl
                                      bg-orange-50/50 dark:bg-orange-900/10
                                      border border-orange-200/30 dark:border-orange-500/10">
                  <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${
                    item.status === 'success' ? 'text-green-500' : 'text-orange-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-charcoal-900 dark:text-cream-100">
                      {item.text}
                    </div>
                    <div className="text-xs text-charcoal-600 dark:text-charcoal-400">
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gradient-to-br from-gold-400 to-orange-500 dark:from-gold-pastel/40 dark:to-orange-pastel/40
                        rounded-3xl p-6 card-lift relative overflow-hidden
                        animate-fade-in-up"
               style={{animationDelay: '400ms'}}>
            <div className="absolute inset-0 dot-grid opacity-20" />
            <div className="relative z-10">
              <div className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-2 uppercase tracking-wide">
                This Week
              </div>
              <div className="text-5xl font-black text-white mb-2">
                2.4K
              </div>
              <div className="text-orange-100 dark:text-orange-200">
                Total Transactions
              </div>
              <div className="mt-4 flex items-center gap-2 text-orange-900 dark:text-orange-200">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-semibold">+12% from last week</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
