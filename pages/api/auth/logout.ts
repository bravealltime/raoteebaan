import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Create a response object
    const res = NextResponse.json({ success: true, message: 'Logged out successfully' });

    // Set the token cookie to be expired
    res.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      expires: new Date(0),
      path: '/',
    });

    return res;
  } catch (error) {
    return NextResponse.json({ success: false, message: 'An error occurred during logout.' }, { status: 500 });
  }
}
