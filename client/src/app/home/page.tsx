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
    { label: "Active Users", value: "127", icon: Users, color: "primary" },
    { label: "Reports Today", value: "42", icon: FileText, color: "secondary" },
    { label: "System Status", value: "Healthy", icon: Activity, color: "success" },
  ];

  return (
    <div className="min-h-screen bg-[var(--theme-background)]">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 rounded-full blur-3xl animate-float"
               style={{ backgroundColor: 'var(--theme-accent)' }} />
          <div className="absolute bottom-20 right-40 w-48 h-48 rounded-full blur-3xl animate-float"
               style={{ backgroundColor: 'var(--theme-secondary)', animationDelay: '1s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="flex-1 animate-fade-in-up">
              <div className="flex items-center gap-3 mb-4">
                <Flame className="h-10 w-10 text-[var(--theme-accent)] animate-pulse" />
                <span className="text-[var(--theme-accent-light)] font-semibold text-sm uppercase tracking-wider">
                  Welcome Back
                </span>
              </div>
              <h1 className="text-hero text-[var(--theme-text-on-primary)] mb-4 text-shadow-lg">
                {greeting},<br/>{userName}!
              </h1>
              <p className="text-2xl text-[var(--theme-text-on-primary)]/80 max-w-2xl mb-8">
                Your command center for all things Huey Magoo&apos;s.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/departments/reporting">
                  <button className="px-8 py-4 bg-white text-[var(--theme-primary)] font-bold rounded-2xl
                                   shadow-lift hover:shadow-lift-lg transition-all duration-300
                                   hover:scale-105 flex items-center gap-2 group">
                    View Reports
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link href="/teams">
                  <button className="px-8 py-4 bg-[var(--theme-primary-dark)]/30 backdrop-blur text-[var(--theme-text-on-primary)] font-bold rounded-2xl
                                   border-2 border-white/30 hover:bg-[var(--theme-primary-dark)]/50
                                   transition-all duration-300 hover:scale-105">
                    Manage Teams
                  </button>
                </Link>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20
                          animate-fade-in-up" style={{animationDelay: '200ms'}}>
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-5 w-5 text-[var(--theme-accent)]" />
                <span className="text-[var(--theme-text-on-primary)]/80 text-sm">Current Time</span>
              </div>
              <div className="text-4xl font-bold text-[var(--theme-text-on-primary)] mb-1">{currentTime}</div>
              <div className="text-[var(--theme-text-on-primary)]/70 text-sm">
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

            return (
              <div
                key={index}
                className="bg-[var(--theme-surface)] rounded-2xl p-6 card-lift
                         border border-[var(--theme-border)]
                         card-textured animate-scale-in"
                style={{animationDelay: `${index * 100}ms`}}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="p-3 rounded-xl shadow-glow"
                    style={{
                      background: stat.color === 'success'
                        ? `linear-gradient(to bottom right, var(--theme-success), #10b981)`
                        : `linear-gradient(to bottom right, var(--theme-${stat.color}), var(--theme-${stat.color}-dark))`
                    }}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <TrendingUp className="h-5 w-5 text-[var(--theme-success)]" />
                </div>
                <div className="text-4xl font-black text-[var(--theme-text)] mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-[var(--theme-text-muted)]">
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
          <div
            className="md:col-span-2 md:row-span-2
                      rounded-3xl p-8 card-lift overflow-hidden relative
                      animate-fade-in-up"
            style={{ background: `linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))` }}
          >
            <div className="absolute inset-0 diagonal-stripes opacity-20" />
            <div className="relative z-10">
              <Zap className="h-12 w-12 text-[var(--theme-accent)] mb-4" />
              <h2 className="text-display text-[var(--theme-text-on-primary)] mb-4">
                Quick Actions
              </h2>
              <p className="text-xl text-[var(--theme-text-on-primary)]/80 mb-8 max-w-md">
                Jump right into your most important tasks.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Loyalty Transactions", href: "/departments/data", icon: FileText },
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
                        <ActionIcon className="h-6 w-6 text-[var(--theme-text-on-primary)] mb-2" />
                        <div className="text-[var(--theme-text-on-primary)] font-semibold flex items-center justify-between">
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
          <div className="bg-[var(--theme-surface)] rounded-3xl p-6 card-lift
                        border border-[var(--theme-border)]
                        card-textured animate-fade-in-up"
               style={{animationDelay: '300ms'}}>
            <h3 className="text-xl font-bold text-[var(--theme-text)] mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[
                { text: "Report generated", time: "2m ago", status: "success" },
                { text: "User added", time: "1h ago", status: "info" },
                { text: "Data synced", time: "3h ago", status: "success" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl
                                      bg-[var(--theme-surface-hover)]
                                      border border-[var(--theme-border)]">
                  <CheckCircle2 className={`h-5 w-5 flex-shrink-0 ${
                    item.status === 'success' ? 'text-[var(--theme-success)]' : 'text-[var(--theme-primary)]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[var(--theme-text)]">
                      {item.text}
                    </div>
                    <div className="text-xs text-[var(--theme-text-muted)]">
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div
            className="rounded-3xl p-6 card-lift relative overflow-hidden
                      animate-fade-in-up"
            style={{
              background: `linear-gradient(to bottom right, var(--theme-accent), var(--theme-primary))`,
              animationDelay: '400ms'
            }}
          >
            <div className="absolute inset-0 dot-grid opacity-20" />
            <div className="relative z-10">
              <div className="text-sm font-semibold text-[var(--theme-text-on-primary)]/80 mb-2 uppercase tracking-wide">
                This Week
              </div>
              <div className="text-5xl font-black text-[var(--theme-text-on-primary)] mb-2">
                2.4K
              </div>
              <div className="text-[var(--theme-text-on-primary)]/80">
                Total Transactions
              </div>
              <div className="mt-4 flex items-center gap-2 text-[var(--theme-text-on-primary)]/90">
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
