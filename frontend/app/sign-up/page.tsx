"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId") || searchParams.get("id");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (invitationId) {
      authClient.organization.getInvitation({
        query: { id: invitationId }
      }).then(res => {
        if (res.data) {
          setEmail(res.data.email);
        }
      });
    }
  }, [invitationId]);

  async function onSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name,
        callbackURL: "/inbox",
      });
      if (result.error && result.error.code !== "USER_ALREADY_EXISTS") {
        throw new Error(result.error.message || "Unable to sign up.");
      }

      if (invitationId) {
        const accept = await authClient.organization.acceptInvitation({ invitationId });
        if (accept.error) throw new Error(accept.error.message);
      }

      router.push("/inbox");
      router.refresh();
    } catch (signUpError) {
      setError(signUpError instanceof Error ? signUpError.message : "Unable to sign up.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join the shared inbox workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-3" onSubmit={onSignUp}>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Name</p>
              <Input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <Input
                required
                type="email"
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
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <button onClick={() => router.push("/sign-in")} className="text-primary hover:underline">
              Sign In
            </button>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-svh items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950 text-muted-foreground">Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}
