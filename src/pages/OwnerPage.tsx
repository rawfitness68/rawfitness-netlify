import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/lib/supabase";
import { useSession } from "@/hooks/use-session";
import { listCustomers, updateCustomerPlan } from "@/lib/api";
import { formatDate, planEndDateInfo, type Customer } from "@/lib/customer-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


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

export function OwnerPortal() {
  const { session, loading } = useSession();

  if (loading) return <Splash />;
  if (!session) return <OwnerLogin />;
  return <OwnerDashboard />;
}

function OwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid login")
          ? "Wrong email or password."
          : "Sign in failed. Please try again.",
      );
    }
  }

  return (
    <Shell title="Owner sign in" subtitle="Email and password access for the gym owner.">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full font-semibold uppercase tracking-wide"
          disabled={busy || !email || !password}
        >
          {busy && <Loader2 className="size-4 animate-spin" />} Sign in
        </Button>
      </form>
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-3">
        <Logo />
        <h1 className="text-3xl font-extrabold uppercase tracking-tight text-foreground">
          Raw<span className="text-primary">Fitness</span>
        </h1>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold tracking-tight">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}

function OwnerDashboard() {
  const fetchCustomers = listCustomers;
  const { data: customers, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchCustomers(),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (isLoading) return <Splash />;
  if (error) {
    const msg = error instanceof Error ? error.message : "";
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">
          {msg.includes("Forbidden")
            ? "This account isn't the owner account."
            : "Couldn't load customers. Please try again."}
        </p>
        <Button variant="outline" className="mt-4" onClick={signOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    );
  }

  const all = customers ?? [];
  const expired = all.filter((c) => planEndDateInfo(c).expired);

  return (
    <div className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="size-9" />
            <div>
              <p className="text-sm font-bold tracking-tight text-foreground">Owner portal</p>
              <p className="text-xs text-muted-foreground">
                {all.length} member{all.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
            <LogOut className="size-4" />
          </Button>
        </header>

        {expired.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-foreground">
              <AlertTriangle className="size-4 text-destructive" /> Expired plans
            </h2>
            <div className="space-y-2">
              {expired.map((c) => (
                <CustomerRow key={c.id} customer={c} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-foreground">
            All members
          </h2>
          {all.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No members yet. They appear here as soon as they sign up from the member
                portal.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {all.map((c) => (
                <CustomerRow key={c.id} customer={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function statusBadge(c: Customer) {
  const info = planEndDateInfo(c);
  if (info.expired) return <Badge variant="destructive">Expired</Badge>;
  if (info.endDate)
    return (
      <Badge>
        {info.daysLeft === 0 ? "Last day" : `${info.daysLeft}d left`}
      </Badge>
    );
  return <Badge variant="secondary">No plan</Badge>;
}

/** Signed URL loader for a member's private profile photo (owner can view all). */
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

function MemberAvatar({ customer }: { customer: Customer }) {
  const url = useAvatarUrl(customer.avatar_url);
  return (
    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-sm font-bold text-muted-foreground">
      {url ? (
        <img src={url} alt={customer.name ?? customer.phone_number} className="size-full object-cover" />
      ) : (
        (customer.name || customer.phone_number).slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

function CustomerRow({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        className="cursor-pointer py-0 transition-colors hover:bg-accent"
        onClick={() => setOpen(true)}
      >
        <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <MemberAvatar customer={customer} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {customer.name || customer.phone_number}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {customer.name ? `${customer.phone_number} · ` : ""}
                {customer.goal || "No goal set"}
                {customer.weight_kg != null ? ` · ${customer.weight_kg} kg` : ""}
              </p>
            </div>
          </div>
          {statusBadge(customer)}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <MemberAvatar customer={customer} />
              <span>{customer.name || customer.phone_number}</span>
            </DialogTitle>
            <DialogDescription>
              {customer.phone_number}
              {customer.height_cm != null || customer.weight_kg != null
                ? ` · ${customer.height_cm ?? "—"} cm · ${customer.weight_kg ?? "—"} kg`
                : " · Member hasn't filled in details yet"}
              {customer.goal ? ` · Goal: ${customer.goal}` : ""}
            </DialogDescription>
          </DialogHeader>
          <PlanEditor customer={customer} onSaved={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlanEditor({
  customer,
  onSaved,
}: {
  customer: Customer;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [diet, setDiet] = useState(customer.diet_plan ?? "");
  const [workout, setWorkout] = useState(customer.workout_plan ?? "");
  const [startDate, setStartDate] = useState(customer.plan_start_date ?? "");
  const [duration, setDuration] = useState(
    customer.plan_duration_days?.toString() ?? "",
  );

  const update = updateCustomerPlan;
  const save = useMutation({
    mutationFn: () =>
      update({
        data: {
          id: customer.id,
          diet_plan: diet.trim() === "" ? null : diet,
          workout_plan: workout.trim() === "" ? null : workout,
          plan_start_date: startDate === "" ? null : startDate,
          plan_duration_days: duration.trim() === "" ? null : Number(duration),
        },
      }),
    onSuccess: () => {
      toast.success("Plan saved");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onSaved();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const durationNum = Number(duration);
  const valid =
    (duration.trim() === "" ||
      (!Number.isNaN(durationNum) && durationNum >= 1 && durationNum <= 3650)) &&
    (startDate === "" || /^\d{4}-\d{2}-\d{2}$/.test(startDate));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) save.mutate();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="diet">Diet plan</Label>
        <Textarea
          id="diet"
          rows={5}
          value={diet}
          onChange={(e) => setDiet(e.target.value)}
          placeholder="Diet instructions for this member…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="workout">Workout plan</Label>
        <Textarea
          id="workout"
          rows={5}
          value={workout}
          onChange={(e) => setWorkout(e.target.value)}
          placeholder="Workout instructions for this member…"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start">Plan start date</Label>
          <Input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (days)</Label>
          <Input
            id="duration"
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 30"
          />
        </div>
      </div>
      {planEndDateInfo({
        plan_start_date: startDate || null,
        plan_duration_days: duration.trim() === "" ? null : Number(duration),
      }).endDate && (
        <p className="text-xs text-muted-foreground">
          Plan ends on{" "}
          {formatDate(
            planEndDateInfo({
              plan_start_date: startDate || null,
              plan_duration_days: duration.trim() === "" ? null : Number(duration),
            }).endDate,
          )}
        </p>
      )}
      <Button
        type="submit"
        className="w-full font-semibold uppercase tracking-wide"
        disabled={save.isPending || !valid}
      >
        {save.isPending && <Loader2 className="size-4 animate-spin" />} Save plan
      </Button>
    </form>
  );
}
