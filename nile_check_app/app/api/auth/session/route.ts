import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';

export async function GET() {
  try {
    const user = await getServerSession();
    
    if (!user) {
      return NextResponse.json(
        { success: false, authenticated: false, message: '로그인되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      user
    });
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { success: false, message: '세션 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 