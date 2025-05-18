
"use client";

import { useState } from 'react';
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
import { Leaf, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { signInWithEmail, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await signInWithEmail(data.email, data.password);
      toast({ title: t("loginPage.toast.success.title"), description: t("loginPage.toast.success.description") });
      router.push('/dashboard');
    } catch (error: any) {
      console.error(error);
      let errorMessage = t("loginPage.toast.error.description");
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = t("loginPage.toast.error.invalidCredentials");
      }
      toast({
        title: t("loginPage.toast.error.title"),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <Leaf className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="text-2xl">{t("loginPage.title")}</CardTitle>
        <CardDescription>{t("loginPage.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">{t("loginPage.emailLabel")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...form.register('email')}
              disabled={isSubmitting || authLoading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("loginPage.passwordLabel")}</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              {...form.register('password')}
              disabled={isSubmitting || authLoading}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
            {(isSubmitting || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("loginPage.submitButton")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("loginPage.noAccount")}{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            {t("loginPage.signUpLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
