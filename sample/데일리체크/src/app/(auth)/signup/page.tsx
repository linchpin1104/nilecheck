
"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import type { ConfirmationResult, RecaptchaVerifier, User as FirebaseUser } from 'firebase/auth';
import { Leaf, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, { message: "Invalid phone number format (e.g., +16505551234)." }),
  otp: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const auth = useAuth(); // Changed to get the whole auth object
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [step, setStep] = useState(1); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const appVerifierRef = useRef<RecaptchaVerifier | null>(null);


  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phoneNumber: '',
      otp: '',
    },
  });
  
  useEffect(() => {
    console.log("SignupPage: useEffect for reCAPTCHA, current step:", step);
    if (step === 2 && recaptchaContainerRef.current && !appVerifierRef.current && typeof window !== 'undefined') {
      console.log("SignupPage: Setting up reCAPTCHA.");
      try {
        appVerifierRef.current = auth.setupRecaptcha('recaptcha-container-signup');
        console.log("SignupPage: reCAPTCHA setup successful.");
      } catch (error) {
        console.error("SignupPage: Error setting up reCAPTCHA:", error);
        toast({ title: t("signupPage.toast.recaptchaError.title"), description: t("signupPage.toast.recaptchaError.description"), variant: "destructive" });
      }
    }
  }, [step, auth.setupRecaptcha, toast, t, auth]);


  const handleEmailSignup = async (data: SignupFormValues) => {
    console.log("SignupPage: handleEmailSignup triggered with data:", data);
    setIsSubmitting(true);
    console.log("SignupPage: isSubmitting set to true.");
    try {
      console.log("SignupPage: Calling auth.signUpWithEmail...");
      const fbUser = await auth.signUpWithEmail(data.name, data.email, data.password);
      console.log("SignupPage: auth.signUpWithEmail returned:", fbUser?.uid);
      if (fbUser) {
        setFirebaseUser(fbUser); 
        toast({ title: t("signupPage.toast.emailVerification.title"), description: t("signupPage.toast.emailVerification.description") });
        setStep(2); 
        console.log("SignupPage: Moved to step 2 for phone verification.");
      } else {
        console.warn("SignupPage: fbUser is null after signUpWithEmail.");
        toast({ title: t("signupPage.toast.signupError.title"), description: t("signupPage.toast.signupError.description"), variant: "destructive" });
      }
    } catch (error: any) {
      console.error("SignupPage: Error during email signup process:", error);
      let errorMessage = t("signupPage.toast.signupError.description");
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t("signupPage.toast.signupError.emailInUse");
      }
      toast({
        title: t("signupPage.toast.signupError.title"),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
      console.log("SignupPage: isSubmitting set to false in finally block.");
    }
  };
  
  const handleSendOtp = async () => {
    console.log("SignupPage: handleSendOtp triggered.");
    const phoneNumber = form.getValues('phoneNumber');
    if (!appVerifierRef.current) {
        console.error("SignupPage: reCAPTCHA verifier not ready.");
        toast({ title: t("signupPage.toast.recaptchaError.title"), description: t("signupPage.toast.recaptchaError.notReady"), variant: "destructive" });
        return;
    }
    if (!phoneNumber) {
        console.error("SignupPage: Phone number is required for OTP.");
        form.setError("phoneNumber", { type: "manual", message: "Phone number is required." });
        return;
    }
    setIsSubmitting(true);
    console.log("SignupPage: isSubmitting set to true for OTP send.");
    try {
      const result = await auth.sendOtpToPhone(phoneNumber, appVerifierRef.current);
      setConfirmationResult(result);
      toast({ title: t("signupPage.toast.otpSent.title") });
      console.log("SignupPage: OTP sent, confirmationResult set.");
    } catch (error) {
      console.error("SignupPage: Error sending OTP:", error);
      toast({ title: t("signupPage.toast.otpError.title"), description: t("signupPage.toast.otpError.description"), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      console.log("SignupPage: isSubmitting set to false in OTP send finally block.");
    }
  };

  const handleVerifyOtp = async () => {
    console.log("SignupPage: handleVerifyOtp triggered.");
    const otp = form.getValues('otp');
    if (!confirmationResult) {
      console.error("SignupPage: OTP confirmationResult is null.");
      toast({ title: t("signupPage.toast.otpError.title"), description: t("signupPage.toast.otpError.noConfirmation"), variant: 'destructive' });
      return;
    }
    if (!otp || otp.length !== 6) {
        console.error("SignupPage: OTP must be 6 digits.");
        form.setError("otp", { type: "manual", message: "OTP must be 6 digits."});
        return;
    }
    setIsSubmitting(true);
    console.log("SignupPage: isSubmitting set to true for OTP verification.");
    try {
      await auth.confirmOtp(confirmationResult, otp);
      if (firebaseUser) {
        const name = form.getValues('name');
        const phoneNumber = form.getValues('phoneNumber');
        console.log("SignupPage: Calling updateUserProfileNameAndPhone for UID:", firebaseUser.uid);
        await auth.updateUserProfileNameAndPhone(firebaseUser.uid, name, phoneNumber, true);
      } else {
        console.warn("SignupPage: firebaseUser is null, cannot update profile with phone info.");
      }
      toast({ title: t("signupPage.toast.phoneVerified.title"), description: t("signupPage.toast.phoneVerified.description") });
      router.push('/dashboard');
      console.log("SignupPage: Phone verified, navigated to dashboard.");
    } catch (error: any) {
      console.error("SignupPage: Error verifying OTP:", error);
       let errorMessage = t("signupPage.toast.otpError.verificationFailed");
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = t("signupPage.toast.otpError.invalidCode");
      }
      toast({ title: t("signupPage.toast.otpError.title"), description: errorMessage, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      console.log("SignupPage: isSubmitting set to false in OTP verify finally block.");
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <Leaf className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-2xl">{t("signupPage.title")}</CardTitle>
        <CardDescription>{step === 1 ? t("signupPage.descriptionStep1") : t("signupPage.descriptionStep2")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form 
            onSubmit={form.handleSubmit(step === 1 ? handleEmailSignup : handleVerifyOtp)} 
            className="space-y-6"
        >
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">{t("signupPage.nameLabel")}</Label>
                <Input id="name" {...form.register('name')} disabled={isSubmitting || auth.loading} />
                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("signupPage.emailLabel")}</Label>
                <Input id="email" type="email" {...form.register('email')} disabled={isSubmitting || auth.loading} />
                {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("signupPage.passwordLabel")}</Label>
                <Input id="password" type="password" {...form.register('password')} disabled={isSubmitting || auth.loading} />
                {form.formState.errors.password && <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>}
              </div>
               <Button type="submit" className="w-full" disabled={isSubmitting || auth.loading}>
                {(isSubmitting || auth.loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("signupPage.continueButton")}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div id="recaptcha-container-signup" ref={recaptchaContainerRef}></div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{t("signupPage.phoneLabel")}</Label>
                <div className="flex gap-2">
                    <Input id="phoneNumber" type="tel" {...form.register('phoneNumber')} placeholder="+821012345678" disabled={isSubmitting || auth.loading || !!confirmationResult} />
                    <Button type="button" onClick={handleSendOtp} disabled={isSubmitting || auth.loading || !!confirmationResult}>
                        {isSubmitting && !confirmationResult ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("signupPage.sendOtpButton")}
                    </Button>
                </div>
                {form.formState.errors.phoneNumber && <p className="text-sm text-destructive">{form.formState.errors.phoneNumber.message}</p>}
              </div>
              {confirmationResult && (
                <div className="space-y-2">
                  <Label htmlFor="otp">{t("signupPage.otpLabel")}</Label>
                  <Input id="otp" type="text" {...form.register('otp')} disabled={isSubmitting || auth.loading} />
                  {form.formState.errors.otp && <p className="text-sm text-destructive">{form.formState.errors.otp.message}</p>}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || auth.loading || !confirmationResult}>
                {(isSubmitting || auth.loading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("signupPage.verifyOtpButton")}
              </Button>
               <Button variant="link" onClick={() => setStep(1)} disabled={isSubmitting || auth.loading} className="w-full">
                 {t("signupPage.backToEmailButton")}
               </Button>
            </>
          )}
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("signupPage.hasAccount")}{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("signupPage.loginLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
