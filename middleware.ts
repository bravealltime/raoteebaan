

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper function to get the primary dashboard path based on user role
function getDashboardPath(role: string): string {
    switch (role) {
        case 'admin': return '/dashboard';
        case 'owner': return '/owner-dashboard';
        case 'employee': return '/employee'; 
        case 'technician': return '/technician-dashboard';
        case 'user': return '/tenant-dashboard';
        default: return '/login'; // Default to login if role is unknown
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('token')?.value;

    // Define public routes that do not require authentication
    const publicRoutes = ['/login', '/reset-password'];

    // If the route is public, let the request through
    if (publicRoutes.includes(pathname)) {
        // But if a logged-in user tries to access login/reset, redirect them to their dashboard
        if (token) {
            try {
                const verifyUrl = new URL('/api/auth/verify-token', request.url);
                const response = await fetch(verifyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                if (response.ok) {
                    const { role } = await response.json();
                    return NextResponse.redirect(new URL(getDashboardPath(role), request.url));
                }
            } catch (e) {
                // Invalid token, let them proceed to the public route
            }
        }
        return NextResponse.next();
    }

    // For all other routes, a token is required
    if (!token) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // If a token exists, verify it and check role-based access
    try {
        const verifyUrl = new URL('/api/auth/verify-token', request.url);
        const response = await fetch(verifyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        if (!response.ok) {
            throw new Error('Token verification failed');
        }

        const { role } = await response.json();
        if (!role) {
            throw new Error('Role not found in token');
        }

        // Admin has access to everything
        if (role === 'admin') {
            return NextResponse.next();
        }

        // Define role-based access control map
        const accessControl: Record<string, string[]> = {
            'owner': ['/', '/owner-dashboard', '/inbox', '/parcel', '/history', '/bill', '/profile', '/notifications'],
            'technician': ['/technician-dashboard', '/inbox', '/profile', '/notifications'],
            'employee': ['/employee', '/inbox', '/profile', '/notifications'],
            'user': ['/tenant-dashboard', '/bill', '/history', '/inbox', '/parcel', '/profile', '/notifications']
        };

        const allowedPaths = accessControl[role];
        
        // Check if the user's role has access to the requested path
        if (allowedPaths && allowedPaths.some(p => pathname.startsWith(p))) {
            // For dynamic routes like /history/[id], further checks should be done on the client/server-side component
            return NextResponse.next();
        }

        // If the user does not have access, redirect them to their primary dashboard
        const userDashboard = getDashboardPath(role);
        return NextResponse.redirect(new URL(userDashboard, request.url));

    } catch (error) {
        // If token is invalid or any other error, clear it and redirect to login
        const res = NextResponse.redirect(new URL('/login', request.url));
        res.cookies.delete('token');
        return res;
    }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - public assets (fonts, images, etc.)
     */
    '/((?!api|_next/static|_next/image|.*\.(?:svg|png|jpg|jpeg|gif|ico|ttf|mp3|js|css)$).*)',
  ],
};
