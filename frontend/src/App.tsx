import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { FirebaseAuthProvider, useFirebaseAuth } from "./contexts/FirebaseAuthContext";
import { AppLayout } from "./components/layout/AppLayout";
import SignIn from "./pages/SignIn";
import OnboardingFlow from "./pages/OnboardingFlow";
import Dashboard from "./pages/Dashboard";
import LeadGeneration from "./pages/LeadGeneration";
import ContactSheet from "./pages/ContactSheet";
import EmailTemplates from "./pages/EmailTemplates";
import CampaignCompose from "./pages/CampaignCompose";
import Pipeline from "./pages/Pipeline";

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
      <Route path="/signin" element={user ? <Navigate to="/" replace /> : <SignIn />} />
      <Route
        path="/onboarding"
        element={
          !user ? <Navigate to="/signin" replace /> : <OnboardingFlow />
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/leads" element={<LeadGeneration />} />
        <Route path="/contacts" element={<ContactSheet />} />
        <Route path="/templates" element={<EmailTemplates />} />
        <Route path="/campaigns" element={<CampaignCompose />} />
        <Route path="/pipeline" element={<Pipeline />} />
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
