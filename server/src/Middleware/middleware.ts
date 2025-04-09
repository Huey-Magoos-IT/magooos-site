// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)', // Exclude API routes, Next.js internals, static files
  ],
};

export default function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const hostname = nextUrl.hostname;

  // Skip middleware for local development or specific conditions
  if (hostname.endsWith('localhost') || hostname.endsWith('amplifyapp.com')) {
    return NextResponse.next();
  }

  const subdomain = hostname.split('.')[0];

  // Handle special subdomain for the dashboard
  if (subdomain === 'dashboard') {
    return NextResponse.rewrite(new URL('/dashboard', req.url));
  }

  // Default subdomain handling logic
  if (subdomain && subdomain !== 'www') {
    // Rewrite to a user-specific path, adjust according to your app's routing logic
    return NextResponse.rewrite(new URL(`/users/${subdomain}`, req.url));
  }

  return NextResponse.next();
}
