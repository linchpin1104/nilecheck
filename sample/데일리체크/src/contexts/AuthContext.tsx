
"use client";

import type { User as FirebaseUser, ConfirmationResult } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '@/lib/firebase/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<FirebaseUser | null>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  setupRecaptcha: (elementId: string) => RecaptchaVerifier;
  sendOtpToPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  confirmOtp: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  updateUserProfileNameAndPhone: (uid: string, name: string, phoneNumber: string, isPhoneVerified: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log("AuthContext: useEffect for onAuthStateChanged triggered.");
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("AuthContext: onAuthStateChanged callback. currentUser:", currentUser?.uid);
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        console.log("AuthContext: Attempting to fetch user profile for UID:", currentUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            console.log("AuthContext: User profile found in Firestore.");
            const profileData = docSnap.data() as UserProfile;
            if (profileData.createdAt && profileData.createdAt instanceof Timestamp) {
              profileData.createdAt = profileData.createdAt.toDate().toISOString();
            }
            setUserProfile(profileData);
          } else {
            console.log("AuthContext: User profile NOT found in Firestore for UID:", currentUser.uid);
            setUserProfile(null);
          }
        } catch (profileError) {
          console.error("AuthContext: Error fetching user profile:", profileError);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
      console.log("AuthContext: Auth state loading finished. Loading:", false);
    });
    return () => {
      console.log("AuthContext: Unsubscribing from onAuthStateChanged.");
      unsubscribe();
    }
  }, []);

  const signUpWithEmail = async (name: string, email: string, password: string): Promise<FirebaseUser | null> => {
    console.log("AuthContext: signUpWithEmail called with email:", email);
    try {
      console.log("AuthContext: Attempting to create Firebase Auth user with email:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("AuthContext: Firebase Auth user CREATED:", firebaseUser?.uid);

      if (firebaseUser) {
        console.log("AuthContext: Attempting to send verification email to:", firebaseUser.email);
        try {
          await sendEmailVerification(firebaseUser);
          console.log("AuthContext: Verification email SENT successfully.");
        } catch (emailError) {
          console.error("AuthContext: Error sending verification email:", emailError);
          // Continue even if email sending fails for now
        }

        console.log("AuthContext: Attempting to create initial user profile in Firestore for UID:", firebaseUser.uid);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const newUserProfile: Omit<UserProfile, 'phoneNumber' | 'isPhoneVerified'> = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: name,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newUserProfile, { merge: true });
        console.log("AuthContext: Initial Firestore user profile CREATED/MERGED for UID:", firebaseUser.uid);
        setUserProfile(newUserProfile as UserProfile); // Tentatively set, will be updated
        return firebaseUser;
      }
      console.warn("AuthContext: Firebase Auth user creation seemed successful, but firebaseUser object is nullish.");
      return null;
    } catch (error) {
      console.error("AuthContext: Error in signUpWithEmail (createUserWithEmailAndPassword or Firestore profile creation):", error);
      throw error; // Re-throw to be caught by the calling function in signup page
    }
  };
  
  const updateUserProfileNameAndPhone = async (uid: string, name: string, phoneNumber: string, isPhoneVerified: boolean) => {
    console.log("AuthContext: updateUserProfileNameAndPhone called for UID:", uid);
    const userDocRef = doc(db, 'users', uid);
    const updatedProfileData: Partial<UserProfile> = { name, phoneNumber, isPhoneVerified };
     if (!userProfile?.createdAt) { 
        console.log("AuthContext: Creating new profile with phone info for UID:", uid);
        updatedProfileData.createdAt = new Date().toISOString();
        updatedProfileData.email = user?.email; 
        updatedProfileData.uid = uid;
    }
    try {
      await setDoc(userDocRef, updatedProfileData, { merge: true });
      console.log("AuthContext: Firestore user profile UPDATED with phone info for UID:", uid);
      setUserProfile(prev => ({ ...prev, ...updatedProfileData, uid } as UserProfile));
    } catch (profileError) {
      console.error("AuthContext: Error updating Firestore profile with phone info:", profileError);
      throw profileError;
    }
  };


  const signInWithEmail = async (email: string, password: string) => {
    console.log("AuthContext: signInWithEmail called with email:", email);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("AuthContext: signInWithEmailAndPassword successful for:", email);
      // onAuthStateChanged will handle user and userProfile state update
    } catch (error) {
      console.error("AuthContext: Error signing in with email and password:", error);
      throw error;
    }
  };

  const logout = async () => {
    console.log("AuthContext: logout called.");
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
    router.push('/login'); // Redirect to login after logout
    console.log("AuthContext: User logged out.");
  };

  const sendVerificationEmail = async () => {
    console.log("AuthContext: sendVerificationEmail called.");
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
        console.log("AuthContext: Verification email sent to:", auth.currentUser.email);
      } catch (error) {
        console.error("AuthContext: Error sending verification email (within sendVerificationEmail function):", error);
        throw error; // Re-throw to allow UI to handle it
      }
    } else {
      console.warn("AuthContext: No user is currently signed in to send verification email.");
      throw new Error("No user is currently signed in to send verification email.");
    }
  };

  const setupRecaptcha = (elementId: string): RecaptchaVerifier => {
    console.log("AuthContext: setupRecaptcha called for elementId:", elementId);
    if (typeof window !== 'undefined') {
      if ((window as any).recaptchaVerifier) {
        console.log("AuthContext: Existing reCAPTCHA verifier found, attempting to clear first.");
        (window as any).recaptchaVerifier.clear(); // Clear previous instance if exists
      }
      console.log("AuthContext: Creating new reCAPTCHA verifier.");
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
        'size': 'invisible',
        'callback': (response: any) => {
          console.log("AuthContext: reCAPTCHA solved, response:", response);
        }
      });
      return (window as any).recaptchaVerifier;
    }
    console.error("AuthContext: RecaptchaVerifier can only be created in a browser environment.");
    throw new Error("RecaptchaVerifier can only be created in a browser environment.");
  };

  const sendOtpToPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    console.log("AuthContext: sendOtpToPhone called for phoneNumber:", phoneNumber);
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      console.log("AuthContext: OTP sent successfully, confirmationResult received.");
      return confirmationResult;
    } catch (error) {
      console.error("AuthContext: Error sending OTP:", error);
       if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.render().then((widgetId: any) => {
          if (typeof globalThis.grecaptcha !== 'undefined' && widgetId !== undefined) {
            globalThis.grecaptcha.reset(widgetId);
            console.log("AuthContext: reCAPTCHA reset after OTP send error.");
          }
        }).catch((renderError: any) => {
           console.error("AuthContext: Error trying to render/reset reCAPTCHA after OTP send error:", renderError);
        });
      }
      throw error;
    }
  };

  const confirmOtp = async (confirmationResult: ConfirmationResult, otp: string): Promise<void> => {
    console.log("AuthContext: confirmOtp called.");
    try {
      await confirmationResult.confirm(otp);
      console.log("AuthContext: OTP confirmed successfully.");
      if (auth.currentUser && auth.currentUser.phoneNumber) {
        console.log("AuthContext: Updating Firestore profile with verified phone number:", auth.currentUser.phoneNumber);
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDocRef, { phoneNumber: auth.currentUser.phoneNumber, isPhoneVerified: true }, { merge: true });
        setUserProfile(prev => prev ? {...prev, phoneNumber: auth.currentUser!.phoneNumber, isPhoneVerified: true} : null);
        console.log("AuthContext: Firestore profile updated with verified phone number.");
      } else {
        console.warn("AuthContext: OTP confirmed, but currentUser or phoneNumber is missing. Profile not updated with phone.", auth.currentUser);
      }
    } catch (error) {
      console.error("AuthContext: Error confirming OTP:", error);
      throw error;
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    signUpWithEmail,
    signInWithEmail,
    logout,
    sendVerificationEmail,
    setupRecaptcha,
    sendOtpToPhone,
    confirmOtp,
    updateUserProfileNameAndPhone,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
