"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

async function bootstrapOrganization() {
  try {
    await fetch("/api/auth/bootstrap-organization", {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    // Best-effort bootstrap. App layout also enforces org membership.
  }
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        callbackURL: "/settings/home",
      });
      if (result.error) {
        throw new Error(result.error.message || "Unable to sign in.");
      }
      await bootstrapOrganization();
      router.push("/settings/home");
      router.refresh();
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/settings/home",
      });
      if (result.error) {
        throw new Error(result.error.message || "Google sign-in failed.");
      }
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Google sign-in failed.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Access your shared inbox workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={onEmailSignIn}>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <Input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Password</p>
              <Input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <Button type="button" variant="outline" className="w-full" onClick={() => void onGoogleSignIn()} disabled={isSubmitting}>
            Continue with Google
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-sm text-muted-foreground">Account creation is managed by your admin.</p>
        </CardContent>
      </Card>
    </main>
  );
}
