
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams, useNavigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import CompetitorsPage from "./pages/CompetitorsPage";
import SpectatorsPage from "./pages/SpectatorsPage";
import GamesPage from "./pages/GamesPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import WinnersPage from "./pages/WinnersPage";
import RosterPage from "./pages/RosterPage";
import AdminPage from "./pages/AdminPage";
import DashboardPage from "./pages/DashboardPage";
import DashboardAdminPage from "./pages/DashboardAdminPage";
import TeamRandomizerPage from "./pages/TeamRandomizerPage";
import WheelOfDestinyPage from "./pages/WheelOfDestinyPage";
import QrCodesPage from "./pages/QrCodesPage";
import MyTeamPage from "./pages/MyTeamPage";
import OnboardingPage from "./pages/OnboardingPage";
import TeamPage from "./pages/TeamPage";
import TeamEditGamePage from "./pages/TeamEditGamePage";
import TeamSettingsPage from "./pages/TeamSettingsPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./components/AuthProvider";
import CompetitorGuard from "./components/CompetitorGuard";
import { queryClient } from "./lib/queryClient";
import NotificationManager from "./components/NotificationManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const NSErrorDialog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const nsError = searchParams.get("ns_error");
  const [open, setOpen] = useState(!!nsError);

  const handleClose = () => {
    setOpen(false);
    searchParams.delete("ns_error");
    setSearchParams(searchParams, { replace: true });
  };

  if (!nsError) return null;

  const isNotMember = nsError === "not_member";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="h2 text-primary text-xl">
            {isNotMember ? "NS Membership Required" : "Login Failed"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed pt-2">
            {isNotMember ? (
              <>
                Your Discord account isn't linked to an NS membership yet. Make sure to verify your Discord on your NS profile first.
              </>
            ) : (
              "Something went wrong during login. Please try again."
            )}
          </DialogDescription>
        </DialogHeader>
        {isNotMember && (
          <div className="mt-2">
            <a
              href="https://ns.com/profile"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary w-full"
              onClick={handleClose}
            >
              Go to ns.com/profile →
            </a>
            <p className="text-muted-foreground text-sm text-center mt-3">
              Once you've linked Discord, come back and try logging in again.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const App = () => {
  // Global error handling to prevent runtime error overlays
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent rating errors from showing the error overlay
      if (event.reason?.message?.includes('already rated') || 
          event.reason?.isRatingError) {
        console.log('Rating error handled globally, preventing overlay');
        event.preventDefault();
      }
    };

    const handleError = (event: ErrorEvent) => {
      // Prevent rating-related errors from showing overlay
      if (event.error?.isRatingError || 
          event.message?.includes('already rated')) {
        console.log('Error handled globally, preventing overlay');
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <NotificationManager />
          <BrowserRouter>
            <NSErrorDialog />
            <Layout>
              <CompetitorGuard>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/welcome" element={<HomePage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/competitors" element={<CompetitorsPage />} />
                  <Route path="/spectators" element={<SpectatorsPage />} />
                  <Route path="/games" element={<GamesPage />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/winners" element={<WinnersPage />} />
                  <Route path="/roster" element={<RosterPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/dashboard" element={<DashboardAdminPage />} />
                  <Route path="/admin/team-randomizer" element={<TeamRandomizerPage />} />
                  <Route path="/admin/wheel-of-destiny" element={<WheelOfDestinyPage />} />
                  <Route path="/admin/qr-codes" element={<QrCodesPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                  <Route path="/my-team" element={<MyTeamPage />} />
                  <Route path="/team/:slug" element={<TeamPage />} />
                  <Route path="/team/:slug/edit/:gameId" element={<TeamEditGamePage />} />
                  <Route path="/team/:slug/settings" element={<TeamSettingsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CompetitorGuard>
            </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
