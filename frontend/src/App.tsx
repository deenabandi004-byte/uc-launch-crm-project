import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { FirebaseAuthProvider, useFirebaseAuth } from "./contexts/FirebaseAuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import OnboardingFlow from "./pages/OnboardingFlow";
import ConnectGmail from "./pages/ConnectGmail";
import Dashboard from "./pages/Dashboard";
import ContactSheet from "./pages/ContactSheet";
import Outreach from "./pages/Outreach";
import Pipeline from "./pages/Pipeline";
import Tasks from "./pages/Tasks";
import QuotesInvoices from "./pages/QuotesInvoices";
import Replies from "./pages/Replies";
import Calendar from "./pages/Calendar";
import Analytics from "./pages/Analytics";
import LeadGeneration from "./pages/LeadGeneration";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useFirebaseAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" replace />;
  if (user.needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useFirebaseAuth();

  if (isLoading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={user ? <Navigate to="/dashboard" replace /> : <SignIn />} />
      <Route
        path="/onboarding"
        element={
          !user ? <Navigate to="/signin" replace /> :
          !user.needsOnboarding ? <Navigate to="/dashboard" replace /> :
          <OnboardingFlow />
        }
      />
      <Route
        path="/connect-gmail"
        element={
          !user ? <Navigate to="/signin" replace /> : <ConnectGmail />
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<LeadGeneration />} />
        <Route path="/contacts" element={<ContactSheet />} />
        <Route path="/outreach" element={<Outreach />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/quotes" element={<QuotesInvoices />} />
        <Route path="/replies" element={<Replies />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/analytics" element={<Analytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FirebaseAuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </FirebaseAuthProvider>
    </QueryClientProvider>
  );
}
