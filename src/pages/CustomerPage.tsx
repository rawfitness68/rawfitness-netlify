import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, LogOut, Pencil } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";
import { signupCustomer } from "@/lib/api";
import { getMyCustomer, updateMyCustomer } from "@/lib/api";
import {
  customerAuthEmail,
  customerAuthPassword,
  formatDate,
  planEndDateInfo,
  type Customer,
} from "@/lib/customer-auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export function CustomerPortal() {
  const { session, loading } = useSession();

  if (loading) return <Splash />;
  return session ? <Dashboard /> : <AuthCard />;
}

function Splash({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      {children}
    </div>
  );
}

function Logo({ size = "size-10" }: { size?: string }) {
  return (
    <img
      src="/icons/icon-192.png"
      alt="Raw Fitness"
      className={`${size} rounded-xl object-cover`}
    />
  );
}

function AuthCard() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const signup = signupCustomer;
  const digits = phone.replace(/\D/g, "");
  const phoneValid = digits.length >= 10 && digits.length <= 15;
  const pinValid = /^\d{4}$/.test(pin);
  const nameValid = name.trim().length >= 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid || !pinValid || busy || (mode === "signup" && !nameValid)) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        await signup({ data: { name: name.trim(), phone: digits, pin } });
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: customerAuthEmail(digits),
        password: customerAuthPassword(digits, pin),
      });
      if (error) {
        if (error.message.toLowerCase().includes("invalid login")) {
          toast.error(
            mode === "signin"
              ? "Wrong phone number or PIN."
              : "This number is already registered with a different PIN.",
          );
        } else {
          toast.error("Something went wrong. Please try again.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Logo />
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-foreground">
          Raw<span className="text-primary">Fitness</span>
        </h1>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in with your phone number and PIN."
              : "Choose a 4-digit PIN — you'll use it to sign in."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">4-digit PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="tracking-[0.5em]"
              />
            </div>
            <Button
              type="submit"
              className="w-full font-semibold uppercase tracking-wide"
              disabled={busy || !phoneValid || !pinValid || (mode === "signup" && !nameValid)}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account & sign in"}
            </Button>
          </form>

          <Button
            variant="link"
            className="mt-2 w-full"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setPin("");
            }}
          >
            {mode === "signin" ? "New here? Create an account" : "Already registered? Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard() {
  const fetchCustomer = getMyCustomer;
  const queryClient = useQueryClient();
  const { data: customer, isLoading, error } = useQuery({
    queryKey: ["my-customer"],
    queryFn: () => fetchCustomer(),
  });

  if (isLoading) return <Splash />;
  if (error) {
    return (
      <Splash>
        <p className="mt-4 text-sm text-muted-foreground">
          Couldn't load your profile. Please try again.
        </p>
      </Splash>
    );
  }
  if (!customer) {
    return (
      <Splash>
        <p className="mt-4 text-sm text-muted-foreground">
          No member profile found. Please contact the gym.
        </p>
      </Splash>
    );
  }

  return (
    <CustomerHome
      key={customer.id}
      customer={customer}
      onChanged={() => queryClient.invalidateQueries({ queryKey: ["my-customer"] })}
    />
  );
}

/** Signed URL loader for the member's private profile photo. */
function useAvatarUrl(path: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let alive = true;
    supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60)
      .then(({ data }) => {
        if (alive) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}

function CustomerHome({
  customer,
  onChanged,
}: {
  customer: Customer;
  onChanged: () => void;
}) {
  const plan = planEndDateInfo(customer);
  const [expiredSeen, setExpiredSeen] = useState(false);

  return (
    <div className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="size-9" />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">
                {customer.name || "Member"}
              </p>
              <p className="text-xs text-muted-foreground">{customer.phone_number}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="size-4" />
          </Button>
        </header>

        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Plan status</p>
              <p className="text-xs text-muted-foreground">
                {plan.endDate
                  ? `Valid till ${formatDate(plan.endDate)}`
                  : "No active plan assigned"}
              </p>
            </div>
            {plan.expired ? (
              <Badge variant="destructive">Expired</Badge>
            ) : plan.daysLeft != null ? (
              <Badge>
                {plan.daysLeft === 0 ? "Last day" : `${plan.daysLeft} day${plan.daysLeft === 1 ? "" : "s"} left`}
              </Badge>
            ) : (
              <Badge variant="secondary">Not assigned</Badge>
            )}
          </CardContent>
        </Card>

        <ProfileCard customer={customer} onChanged={onChanged} />

        <PlanCard
          title="Diet plan"
          plan={customer.diet_plan}
        />
        <PlanCard
          title="Workout plan"
          plan={customer.workout_plan}
        />
      </div>

      <AlertDialog open={plan.expired && !expiredSeen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Plan expired</AlertDialogTitle>
            <AlertDialogDescription>
              Your plan expired on {formatDate(plan.endDate)}. Please contact the gym to
              renew.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setExpiredSeen(true)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProfileCard({
  customer,
  onChanged,
}: {
  customer: Customer;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(
    customer.height_cm == null || customer.weight_kg == null,
  );

  return editing ? (
    <ProfileForm customer={customer} onDone={() => { setEditing(false); onChanged(); }} />
  ) : (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-bold tracking-tight">My details</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" /> Edit
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <AvatarUpload customer={customer} onChanged={onChanged} />
          <div className="grid flex-1 grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-foreground">{customer.height_cm}</p>
              <p className="text-xs text-muted-foreground">Height (cm)</p>
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{customer.weight_kg}</p>
              <p className="text-xs text-muted-foreground">Weight (kg)</p>
            </div>
            <div className="col-span-1">
              <p className="line-clamp-2 text-lg font-bold text-foreground">
                {customer.goal || "—"}
              </p>
              <p className="text-xs text-muted-foreground">Goal</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AvatarUpload({
  customer,
  onChanged,
}: {
  customer: Customer;
  onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const signedUrl = useAvatarUrl(customer.avatar_url);
  const update = updateMyCustomer;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Photo must be under 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Please sign in again.");
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (error) throw new Error("Could not upload the photo.");
      await update({ data: { avatar_url: path } });
      toast.success("Photo updated");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload the photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label="Change profile photo"
        className="block size-16 overflow-hidden rounded-full border border-border bg-secondary"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
      >
        {signedUrl ? (
          <img src={signedUrl} alt="Profile photo" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center text-lg font-bold text-muted-foreground">
            {(customer.name || customer.phone_number).slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>
      <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
        {busy ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
      </span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
}

function ProfileForm({
  customer,
  onDone,
}: {
  customer: Customer;
  onDone: () => void;
}) {
  const [height, setHeight] = useState(customer.height_cm?.toString() ?? "");
  const [weight, setWeight] = useState(customer.weight_kg?.toString() ?? "");
  const [goal, setGoal] = useState(customer.goal ?? "");

  const update = updateMyCustomer;
  const save = useMutation({
    mutationFn: () =>
      update({
        data: {
          height_cm: height.trim() === "" ? null : Number(height),
          weight_kg: weight.trim() === "" ? null : Number(weight),
          goal: goal.trim() === "" ? null : goal.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Details saved");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const heightNum = Number(height);
  const weightNum = Number(weight);
  const valid =
    (height.trim() === "" || (!Number.isNaN(heightNum) && heightNum >= 50 && heightNum <= 300)) &&
    (weight.trim() === "" || (!Number.isNaN(weightNum) && weightNum >= 10 && weightNum <= 700));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold tracking-tight">My details</CardTitle>
        <CardDescription>Height, weight and your fitness goal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save.mutate();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                inputMode="decimal"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="170"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="65"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Fitness goal</Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Lose 5 kg"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 font-semibold uppercase tracking-wide"
              disabled={save.isPending || !valid}
            >
              {save.isPending && <Loader2 className="size-4 animate-spin" />} Save
            </Button>
            {customer.height_cm != null && (
              <Button type="button" variant="outline" onClick={onDone}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PlanCard({ title, plan }: { title: string; plan: string | null }) {
  return (
    <Card>
      <CardHeader className="space-y-0">
        <CardTitle className="text-base font-bold uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {plan ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{plan}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your trainer hasn't assigned this yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
