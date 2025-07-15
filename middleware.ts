

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper function to get the dashboard path based on user role
function getDashboardPath(role: string): string {
    switch (role) {
        case 'admin': return '/dashboard';
        case 'owner': return '/owner-dashboard';
        case 'employee': return '/employee';
        case 'technician': return '/technician-dashboard';
        case 'user': return '/tenant-dashboard';
        default: return '/';
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('token')?.value;

    const protectedRoutes: Record<string, string[]> = {
        '/dashboard': ['admin'],
        '/owner-dashboard': ['owner'],
        '/employee': ['employee'],
        '/technician-dashboard': ['technician'],
        '/tenant-dashboard': ['user'],
        '/admin-users': ['admin'],
        // Shared routes
        '/inbox': ['admin', 'owner', 'employee', 'user', 'technician'],
        '/notifications': ['admin', 'owner', 'employee', 'user', 'technician'],
        '/profile': ['admin', 'owner', 'employee', 'user', 'technician'],
        '/bill': ['admin', 'owner', 'user'],
        '/history': ['admin', 'owner', 'user'],
    };

    const isProtectedRoute = Object.keys(protectedRoutes).some(route => pathname.startsWith(route));

    // 1. If user is not logged in and tries to access a protected route, redirect to login
    if (!token && isProtectedRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 2. If user is logged in
    if (token) {
        const verifyUrl = new URL('/api/auth/verify-token', request.url);
        try {
            const response = await fetch(verifyUrl, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (!response.ok) throw new Error('Token verification failed');

            const { role } = await response.json();
            if (!role) throw new Error('Role not found');

            const userDashboard = getDashboardPath(role);

            // If logged-in user is on the login page, redirect to their dashboard
            if (pathname === '/login') {
                return NextResponse.redirect(new URL(userDashboard, request.url));
            }

            // If user tries to access a page they don't have permission for, redirect to their dashboard
            const allowedRoles = Object.entries(protectedRoutes).find(([route]) => pathname.startsWith(route))?.[1];
            if (allowedRoles && !allowedRoles.includes(role)) {
                return NextResponse.redirect(new URL(userDashboard, request.url));
            }

        } catch (error) {
            // If token is invalid or any other error, clear it and redirect to login
            const res = NextResponse.redirect(new URL('/login', request.url));
            res.cookies.delete('token');
            return res;
        }
    }

    return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - all files in the public folder (e.g. favicon.ico)
     */
    '/((?!api|_next/static|_next/image|.*\\.ico|.*\\.png|.*\\.mp3|.*\\.js).*)/',
  ],
};
