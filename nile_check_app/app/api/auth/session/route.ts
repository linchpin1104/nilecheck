import { NextResponse } from 'next/server';
import { getServerSession, createSession, setAuthCookie } from '@/lib/auth-server';

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

// 세션 복구를 위한 POST 요청 처리
export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // 세션 복구 요청인지 확인
    if (data.action === 'restore' && data.user) {
      console.log('[Session API] 세션 복구 요청 받음:', data.user.id);
      
      // 사용자 ID 확인 - 세션 복구 승인을 위한 추가 검증도 여기에 추가할 수 있음
      const user = data.user;
      
      // JWT 토큰 생성
      const token = await createSession(user);
      
      // 응답 생성 및 쿠키 설정
      const response = NextResponse.json({
        success: true,
        message: '세션이 복구되었습니다.',
        authenticated: true,
        user: user
      });
      
      // 인증 쿠키 설정
      return setAuthCookie(response, token);
    }
    
    return NextResponse.json({
      success: false,
      message: '잘못된 요청입니다.',
      authenticated: false
    }, { status: 400 });
  } catch (error) {
    console.error('[Session API] 오류:', error);
    
    return NextResponse.json({
      success: false,
      message: '세션 복구 중 오류가 발생했습니다.',
      authenticated: false
    }, { status: 500 });
  }
} 