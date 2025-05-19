import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-server';

// 응답에 캐싱 헤더 추가 함수
function addCacheHeaders(response: NextResponse) {
  // 브라우저 캐싱은 짧게, CDN/Edge 캐싱은 없음
  response.headers.set('Cache-Control', 'private, max-age=5');
  return response;
}

export async function GET() {
  try {
    const user = await getServerSession();
    
    if (!user) {
      const response = NextResponse.json(
        { success: false, authenticated: false, message: '로그인되지 않은 사용자입니다.' },
        { status: 401 }
      );
      return addCacheHeaders(response);
    }
    
    const response = NextResponse.json({
      success: true,
      authenticated: true,
      user
    });
    
    return addCacheHeaders(response);
  } catch (error) {
    console.error('Session error:', error);
    const response = NextResponse.json(
      { success: false, message: '세션 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
    return addCacheHeaders(response);
  }
} 