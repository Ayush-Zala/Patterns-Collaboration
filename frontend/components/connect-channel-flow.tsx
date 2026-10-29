"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Link2, LoaderCircle, Mail, MessageCircleMore, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Provider = "gmail" | "outlook" | "whatsapp";

type ProviderOption = {
  value: Provider;
  title: string;
  description: string;
  supported: boolean;
  icon: React.ComponentType<{ className?: string }>;
};

const providerOptions: ProviderOption[] = [
  {
    value: "gmail",
    title: "Gmail",
    description: "Connect shared email from Google Workspace.",
    supported: true,
    icon: Mail,
  },
  {
    value: "outlook",
    title: "Outlook",
    description: "Connect mailbox from Microsoft 365.",
    supported: true,
    icon: Mail,
  },
  {
    value: "whatsapp",
    title: "WhatsApp",
    description: "Connect WhatsApp Business number.",
    supported: false,
    icon: MessageCircleMore,
  },
];

const OAUTH_CONTEXT_KEY = "shared-inbox:connect-channel:oauth-context";

type OAuthContext = {
  provider: "gmail";
  fromModule: string;
  inboxId: string | null;
  channelId: string | null;
  channelName: string;
  redirectUri: string;
  createdAt: number;
};

function resolvePostConnectRoute(fromModule: string, inboxId: string | null): string {
  if (inboxId) return `/settings/inboxes/${inboxId}?channelConnected=1`;
  if (fromModule === "inbox") return "/inbox?channelConnected=1";
  if (fromModule === "inboxes") return "/settings/inboxes?channelConnected=1";
  return "/settings/channels?channelConnected=1";
}

export function ConnectChannelFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromModule = searchParams.get("from") || "channels";
  const inboxId = searchParams.get("inboxId");
  const channelId = searchParams.get("channelId");
  const queryProvider = searchParams.get("provider");
  const queryAccountEmail = searchParams.get("accountEmail");
  const oauthCode = searchParams.get("code");
  const oauthState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const [provider, setProvider] = useState<Provider>(
    queryProvider === "outlook" ? "outlook" : "gmail"
  );
  const [accountEmail, setAccountEmail] = useState(queryAccountEmail || "");
  const [channelName, setChannelName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [callbackStarted, setCallbackStarted] = useState(false);
  const lockRef = useRef(false);
  const handledOAuthCallbackRef = useRef<string | null>(null);

  const activeProvider = useMemo(
    () => providerOptions.find((option) => option.value === provider) || providerOptions[0],
    [provider]
  );

  useEffect(() => {
    if (!oauthError) return;
    setError(`Google OAuth failed: ${oauthError}. Please try again.`);
  }, [oauthError]);

  useEffect(() => {
    if (!oauthCode) return;
    
    // Mega-Lock: Ref check + state check + SessionStorage check
    const lockKey = `lock:${oauthState || ""}:${oauthCode}`;
    if (lockRef.current || callbackStarted || window.sessionStorage.getItem(lockKey)) {
      return;
    }
    
    lockRef.current = true;
    setCallbackStarted(true);
    window.sessionStorage.setItem(lockKey, "1");
    
    const callbackKey = `${oauthState || ""}:${oauthCode}`;
    handledOAuthCallbackRef.current = callbackKey;

    let isMounted = true;

    async function completeGmailCallback() {
      setError(null);
      setSuccess(null);
      setIsConnecting(true);

      console.log(`[ConnectFlow] Triggering callback at ${new Date().toISOString()}`);
      let redirectRoute: string | null = null;
      try {
        const rawContext = window.sessionStorage.getItem(OAUTH_CONTEXT_KEY);
        if (!rawContext) {
          throw new Error("OAuth context not found. Start connection again.");
        }

        const context = JSON.parse(rawContext) as OAuthContext;
        if (context.provider !== "gmail") {
          throw new Error("Invalid OAuth provider context.");
        }
        if (!context.redirectUri) {
          throw new Error("OAuth redirect URI is missing.");
        }

        console.log(`[ConnectFlow] Starting API call to connect channel...`);
        const response = await fetch("/api/settings/channels/connect", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            provider: "gmail",
            oauth_code: oauthCode,
            oauth_state: oauthState || undefined,
            redirect_uri: context.redirectUri,
            channel_name: context.channelName || undefined,
            inbox_id: context.inboxId || undefined,
            channel_id: context.channelId || undefined,
          }),
        });
        
        console.log(`[ConnectFlow] API response received. Status: ${response.status}`);
        const payload = (await response.json()) as { error?: string; channel?: { name?: string } };
        
        if (!response.ok) {
          console.error(`[ConnectFlow] API error:`, payload.error);
          throw new Error(payload.error || "Could not complete Gmail connect.");
        }

        console.log(`[ConnectFlow] Success! Channel: ${payload.channel?.name}`);
        window.sessionStorage.removeItem(OAUTH_CONTEXT_KEY);
        redirectRoute = resolvePostConnectRoute(context.fromModule, context.inboxId);
        if (isMounted) {
          setSuccess(`Channel "${payload.channel?.name || "connected"}" is ready.`);
        }
      } catch (callbackError) {
        console.error(`[ConnectFlow] Callback exception:`, callbackError);
        if (isMounted) {
          setError(callbackError instanceof Error ? callbackError.message : "Could not complete Gmail OAuth callback.");
        }
      } finally {
        if (isMounted) {
          setIsConnecting(false);
        }
        // Always navigate on success, regardless of mount state
        if (redirectRoute) {
          setTimeout(() => {
            router.push(redirectRoute!);
          }, 700);
        }
      }
    }

    void completeGmailCallback();

    return () => {
      isMounted = false;
    };
  }, [oauthCode, oauthState, router, callbackStarted]);


  async function onConnect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsConnecting(true);

    try {
      if (provider === "gmail") {
        const redirectUri = `${window.location.origin}/settings/connect-channel`;
        const startResponse = await fetch("/api/settings/integrations/google", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            redirect_uri: redirectUri,
          }),
        });
        const startPayload = (await startResponse.json()) as { auth_url?: string; error?: string };
        if (!startResponse.ok || !startPayload.auth_url) {
          throw new Error(startPayload.error || "Unable to start Google OAuth.");
        }

        const context: OAuthContext = {
          provider: "gmail",
          fromModule,
          inboxId,
          channelId,
          channelName: channelName.trim(),
          redirectUri,
          createdAt: Date.now(),
        };
        window.sessionStorage.setItem(OAUTH_CONTEXT_KEY, JSON.stringify(context));
        window.location.assign(startPayload.auth_url);
        return;
      }

      const response = await fetch("/api/settings/channels/connect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          provider,
          account_email: accountEmail,
          channel_name: channelName,
          inbox_id: inboxId || undefined,
          channel_id: channelId || undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; channel?: { name?: string } };
      if (!response.ok) {
        throw new Error(payload.error || "Could not connect channel.");
      }

      setSuccess(`Channel "${payload.channel?.name || "connected"}" is ready.`);
      setTimeout(() => {
        router.push(resolvePostConnectRoute(fromModule, inboxId));
      }, 700);
    } catch (connectError) {
      setError(connectError instanceof Error ? connectError.message : "Could not connect channel.");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-10 w-full animate-in fade-in duration-500 min-h-full items-center justify-start">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-background p-8 backdrop-blur-sm shadow-2xl flex flex-col mt-4">
        <div className="mb-8 pb-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Link2 className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Connect to Channel</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Select a communication source, authenticate, and grant permissions.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-1 rounded">Opened from: <span className="text-muted-foreground">{fromModule}</span></p>
            {channelId && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-1 rounded">Reconnect: <span className="text-muted-foreground">{channelId}</span></p>
            )}
            {inboxId && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-1 rounded">Target inbox: <span className="text-muted-foreground">{inboxId}</span></p>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {providerOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={!option.supported}
                onClick={() => option.supported && setProvider(option.value)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all relative overflow-hidden group",
                  option.value === provider 
                    ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.1)]" 
                    : "bg-muted/30 border-border hover:border-border",
                  !option.supported && "cursor-not-allowed opacity-50 hover:border-border"
                )}
              >
                {option.value === provider && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                )}
                <div className="mb-3 flex items-center justify-between">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-lg transition-colors",
                    option.value === provider ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:text-muted-foreground"
                  )}>
                    <option.icon className="size-4" />
                  </div>
                  {!option.supported && <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded">Soon</span>}
                </div>
                <p className={cn("text-base font-bold transition-colors", option.value === provider ? "text-primary" : "text-foreground group-hover:text-foreground")}>{option.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{option.description}</p>
              </button>
            ))}
          </div>

          <form className="space-y-6 pt-4 border-t border-border" onSubmit={onConnect}>
            {provider !== "gmail" && (
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Account email</label>
                <Input
                  required
                  type="email"
                  value={accountEmail}
                  onChange={(event) => setAccountEmail(event.target.value)}
                  placeholder="e.g. team@company.com"
                  className="h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
                />
              </div>
            )}
            
            {provider === "gmail" && (
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 text-sm font-medium flex items-center gap-3">
                <Mail className="size-5 shrink-0" />
                <p>You will be redirected to Google to sign in and grant mailbox access securely.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Channel name (optional)</label>
              <Input
                value={channelName}
                onChange={(event) => setChannelName(event.target.value)}
                placeholder={`e.g. ${activeProvider.title} Support`}
                className="h-12 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 text-base"
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-5">
              <p className="mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Permission scope</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-500">
                    <ShieldCheck className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Read and sync incoming messages</p>
                    <p className="text-xs text-muted-foreground">Allows the shared inbox to receive emails.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-500">
                    <ShieldCheck className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Send replies from connected account</p>
                    <p className="text-xs text-muted-foreground">Allows teammates to reply as the channel.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1 text-emerald-500">
                    <ShieldCheck className="size-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Manage labels/folders metadata</p>
                    <p className="text-xs text-muted-foreground">Synchronizes states back to the provider.</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-400">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-sm font-medium text-emerald-500">
                <CheckCircle2 className="size-5" />
                {success}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-border">
              <Button asChild variant="outline" className="w-full sm:w-auto h-11 px-6 bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors order-2 sm:order-1">
                <Link href={inboxId ? `/settings/inboxes/${inboxId}` : fromModule === "inbox" ? "/inbox" : "/settings/channels"}>
                  Cancel
                </Link>
              </Button>
              <Button type="submit" disabled={isConnecting || (provider !== "gmail" && !accountEmail)} className="w-full sm:w-auto h-11 px-8 bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] order-1 sm:order-2">
                {isConnecting && <LoaderCircle className="size-4 animate-spin mr-2" />}
                {isConnecting ? "Connecting..." : provider === "gmail" ? "Continue with Google" : "Connect Channel"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
