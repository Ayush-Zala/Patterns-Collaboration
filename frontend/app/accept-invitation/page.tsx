"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("id");

  const [status, setStatus] = useState("loading");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invitationId) {
      setStatus("invalid");
      return;
    }

    fetch(`/api/invitations/${invitationId}`)
      .then(res => res.json())
      .then(data => {
        if (data.email) {
          setEmail(data.email);
          setStatus("form");
        } else {
          setStatus("error");
          setError(data.message || data.error || "Invalid invitation");
          console.error("Invitation Error:", data);
        }
      })
      .catch((err) => {
        setStatus("error");
        setError("Failed to connect to the server.");
      });
  }, [invitationId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      // 1. Sign up/Sign in
      const signup = await authClient.signUp.email({ email, name, password, callbackURL: "/inbox" });
      if (signup.error && signup.error.code !== "USER_ALREADY_EXISTS") {
        throw new Error(signup.error.message);
      }

      // 2. Accept
      const accept = await authClient.organization.acceptInvitation({ invitationId: invitationId! });
      if (accept.error) throw new Error(accept.error.message);

      router.push("/inbox");
    } catch (err: any) {
      setError(err.message || "Failed to join");
    }
  };

  if (status === "loading") return <div className="p-20 text-center text-white">Loading invitation...</div>;
  if (status === "invalid") return <div className="p-20 text-center text-red-500">Invalid or expired invitation link.</div>;
  if (status === "error") return <div className="p-20 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-8 space-y-6">
        <h1 className="text-2xl font-bold text-white text-center">Join Organization</h1>
        <p className="text-zinc-400 text-center text-sm">You've been invited as <span className="text-white font-medium">{email}</span></p>
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase">Your Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white" placeholder="John Doe" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-500 uppercase">Set Password</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded p-2 text-white" placeholder="********" />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-colors">Join Organization</button>
        </form>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={<div className="p-20 text-white">Loading...</div>}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
