import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import "./styles.css";
import { supabase } from "@/lib/supabase";
import { CustomerPortal } from "@/pages/CustomerPage";
import { OwnerPortal } from "@/pages/OwnerPage";

const queryClient = new QueryClient();
const isOwner = window.location.pathname.replace(/\/+$/, "") === "/owner";
document.title = isOwner ? "RawFitness — Owner Portal" : "RawFitness — Member Portal";

function App() {
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") queryClient.invalidateQueries();
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {isOwner ? <OwnerPortal /> : <CustomerPortal />}
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
