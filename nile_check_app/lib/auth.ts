import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  createdAt: string;
}

export interface VerificationRequest {
  phoneNumber: string;
  verificationCode: string;
  requestedAt: string;
  verified: boolean;
  attempts: number;
}

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  verificationRequests: VerificationRequest[];
  users: User[];
  error: string | null;
  
  // Authentication methods
  login: (phoneNumber: string, password: string) => Promise<{success: boolean; message: string}>;
  logout: () => void;
  register: (userData: Omit<User, 'id' | 'createdAt'>, password: string) => Promise<{success: boolean; message: string}>;
  
  // Verification methods
  requestVerification: (phoneNumber: string) => Promise<{success: boolean; message: string}>;
  checkVerification: (phoneNumber: string, code: string) => Promise<{success: boolean; message: string}>;
  
  // For demo/development purposes
  getUsers: () => User[];
}

// Mock verification code generation (in a real app, this would be more secure)
const generateVerificationCode = (): string => {
  // Always return "000000" for easier testing
  return "000000";
};

// For demo purposes, we'll store passwords in plain text
// In a real app, you should use a proper hashing mechanism like bcrypt
interface UserWithPassword extends User {
  password: string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      verificationRequests: [],
      // Add a default test user for development
      users: [
        {
          id: "user_default",
          phoneNumber: "010-1234-5678", // Include hyphens to match input format
          name: "테스트 사용자",
          email: "test@example.com",
          createdAt: new Date().toISOString(),
          password: "123456" // In a real app, this would be hashed
        } as UserWithPassword
      ],
      error: null,
      
      login: async (phoneNumber, password) => {
        set({ isLoading: true, error: null });
        
        try {
          // Find user by phone number
          const existingUser = get().users.find(u => u.phoneNumber === phoneNumber);
          
          // Check if user exists
          if (!existingUser) {
            set({ isLoading: false, error: "입력한 전화번호를 찾을 수 없습니다." });
            return { success: false, message: "입력한 전화번호를 찾을 수 없습니다." };
          }
          
          // Perform authentication (for real apps, this would check the hashed password)
          // Use email 'admin' and 'admin' for password for demo purposes
          const foundUser = get().users.find(user => 
            user.phoneNumber === phoneNumber && 
            user.id.endsWith(`_${password}`) // In this demo, password is stored at the end of the ID
          );
          
          // Check if authentication passed
          if (!foundUser) {
            set({ isLoading: false, error: "비밀번호가 일치하지 않습니다." });
            return { success: false, message: "비밀번호가 일치하지 않습니다." };
          }
          
          // Update auth state
          set({ 
            currentUser: foundUser,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          return { success: true, message: "로그인이 완료되었습니다." };
        } catch (error) {
          console.error("Login error:", error);
          set({ isLoading: false, error: "로그인 중 오류가 발생했습니다." });
          return { success: false, message: "로그인 중 오류가 발생했습니다." };
        }
      },
      
      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },
      
      register: async (userData, password) => {
        set({ isLoading: true, error: null });
        
        try {
          // Check if phone number is already in use
          const existingUser = get().users.find(u => u.phoneNumber === userData.phoneNumber);
          
          if (existingUser) {
            set({ isLoading: false, error: "이미 사용 중인 전화번호입니다." });
            return { success: false, message: "이미 사용 중인 전화번호입니다." };
          }
          
          // Create new user
          const newUser: User = {
            id: `user_${crypto.randomUUID()}_${password}`, // Store password in ID for the demo
            ...userData,
            createdAt: new Date().toISOString()
          };
          
          // Add user to store
          set(state => ({ 
            users: [...state.users, newUser],
            currentUser: newUser,
            isAuthenticated: true,
            isLoading: false,
            error: null
          }));
          
          return { success: true, message: "회원가입이 완료되었습니다." };
        } catch (error) {
          console.error("Registration error:", error);
          set({ isLoading: false, error: "회원가입 중 오류가 발생했습니다." });
          return { success: false, message: "회원가입 중 오류가 발생했습니다." };
        }
      },
      
      requestVerification: async (phoneNumber) => {
        set({ isLoading: true });
        
        try {
          // In a real app, this would call the Solapi API to send an SMS
          // For demo purposes, we'll just generate a code
          
          // Generate verification code
          const verificationCode = generateVerificationCode();
          
          console.log(`Verification code for ${phoneNumber}: ${verificationCode}`);
          
          // Create or update verification request
          set(state => {
            const existingRequestIndex = state.verificationRequests.findIndex(
              v => v.phoneNumber === phoneNumber
            );
            
            const newRequest: VerificationRequest = {
              phoneNumber,
              verificationCode,
              requestedAt: new Date().toISOString(),
              verified: false,
              attempts: 0
            };
            
            const newRequests = [...state.verificationRequests];
            
            if (existingRequestIndex >= 0) {
              newRequests[existingRequestIndex] = newRequest;
            } else {
              newRequests.push(newRequest);
            }
            
            return {
              verificationRequests: newRequests,
              isLoading: false
            };
          });
          
          return { 
            success: true, 
            message: "인증번호가 발송되었습니다. 실제 문자는 발송되지 않으며, 콘솔에서 확인할 수 있습니다." 
          };
        } catch (error) {
          console.error("Verification request error:", error);
          set({ isLoading: false, error: "인증번호 발송 중 오류가 발생했습니다." });
          return { success: false, message: "인증번호 발송 중 오류가 발생했습니다." };
        }
      },
      
      checkVerification: async (phoneNumber, code) => {
        set({ isLoading: true });
        
        try {
          // Always accept "000000" or "0000" as valid verification code
          if (code === "000000" || code === "0000") {
            set(state => {
              const requestIndex = state.verificationRequests.findIndex(
                v => v.phoneNumber === phoneNumber
              );
              
              // Create a new request if it doesn't exist
              if (requestIndex < 0) {
                const newRequest: VerificationRequest = {
                  phoneNumber,
                  verificationCode: "000000",
                  requestedAt: new Date().toISOString(),
                  verified: true,
                  attempts: 1
                };
                
                return {
                  verificationRequests: [...state.verificationRequests, newRequest],
                  isLoading: false
                };
              }
              
              // Update existing request
              const request = state.verificationRequests[requestIndex];
              const newRequests = [...state.verificationRequests];
              
              newRequests[requestIndex] = {
                ...request,
                attempts: request.attempts + 1,
                verified: true
              };
              
              return {
                verificationRequests: newRequests,
                isLoading: false
              };
            });
            
            return { success: true, message: "인증이 완료되었습니다." };
          }
          
          // Original verification check for other codes
          set(state => {
            const requestIndex = state.verificationRequests.findIndex(
              v => v.phoneNumber === phoneNumber
            );
            
            if (requestIndex < 0) {
              return { isLoading: false };
            }
            
            const request = state.verificationRequests[requestIndex];
            const newRequests = [...state.verificationRequests];
            
            // Update attempts
            newRequests[requestIndex] = {
              ...request,
              attempts: request.attempts + 1,
              verified: request.verificationCode === code
            };
            
            return {
              verificationRequests: newRequests,
              isLoading: false
            };
          });
          
          const updatedRequest = get().verificationRequests.find(
            v => v.phoneNumber === phoneNumber
          );
          
          if (!updatedRequest) {
            return { success: false, message: "인증 요청을 찾을 수 없습니다." };
          }
          
          if (updatedRequest.verified) {
            return { success: true, message: "인증이 완료되었습니다." };
          } else {
            return { success: false, message: "인증번호가 일치하지 않습니다." };
          }
        } catch (error) {
          console.error("Verification check error:", error);
          set({ isLoading: false, error: "인증 확인 중 오류가 발생했습니다." });
          return { success: false, message: "인증 확인 중 오류가 발생했습니다." };
        }
      },
      
      getUsers: () => {
        return get().users;
      }
    }),
    {
      name: 'nile-check-auth',
      partialize: (state) => ({
        users: state.users,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        verificationRequests: state.verificationRequests
      })
    }
  )
);

// 전역으로 authStore 등록
if (typeof window !== 'undefined') {
  // @ts-expect-error - 전역 객체 확장
  window.authStore = useAuthStore;
}

// Auth 상태 변경 함수들
export function setAuthUser(user: User) {
  useAuthStore.setState({ 
    currentUser: user, 
    isAuthenticated: true,
    isLoading: false,
    error: null
  });
}

export function clearAuthUser() {
  useAuthStore.setState({ 
    currentUser: null, 
    isAuthenticated: false,
    isLoading: false,
    error: null
  });
}

export function setAuthLoading(isLoading: boolean) {
  useAuthStore.setState({ isLoading });
}

export function setAuthError(error: string | null) {
  useAuthStore.setState({ error, isLoading: false });
} 