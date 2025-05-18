import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth-server';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: '로그아웃 성공'
  });
  
  // 인증 쿠키 삭제
  clearAuthCookie(response);
  
  return response;
} 