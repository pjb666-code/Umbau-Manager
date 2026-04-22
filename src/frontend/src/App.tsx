// ============================================================================
// CRITICAL: PDF.js Worker Initialization - MUST BE AT THE ABSOLUTE TOP
// ============================================================================
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

if (typeof window !== "undefined") {
  const script = document.createElement("script");
  script.src =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  script.async = false;
  script.onload = () => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
  };
  document.head.appendChild(script);
}

import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
// ============================================================================
import { useEffect, useState } from "react";
import AppLayout from "./components/AppLayout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ProfileSetupModal from "./components/ProfileSetupModal";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useProjectSession } from "./hooks/useProjectSession";
// FIX: use useGetTopLevelProjects instead of useGetAllProjects
// so session restoration only matches real projects, never phases
import {
  useGetCallerUserProfile,
  useGetTopLevelProjects,
} from "./hooks/useQueries";
import ApplyInvite from "./pages/ApplyInvite";
import Contacts from "./pages/Contacts";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Kostenuebersicht from "./pages/Kostenuebersicht";
import LoginPage from "./pages/LoginPage";
import Media from "./pages/Media";
import ProjectSelection from "./pages/ProjectSelection";
import Roadmap from "./pages/Roadmap";
import Tasks from "./pages/Tasks";
import WelcomeScreen from "./pages/WelcomeScreen";
import { getUrlParameter } from "./utils/urlParams";

type Page =
  | "dashboard"
  | "roadmap"
  | "tasks"
  | "documents"
  | "media"
  | "contacts"
  | "kostenuebersicht"
  | "project-selection"
  | "welcome";

function AppContent() {
  useActor();
  const qc = useQueryClient();
  const { identity, isInitializing, clear } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
  } = useGetCallerUserProfile();
  // FIX: Only load top-level projects (Bauvorhaben), not phases
  const { data: projects, isLoading: projectsLoading } =
    useGetTopLevelProjects();
  const { lastUsedProjectId, setLastUsedProjectId, clearLastUsedProjectId } =
    useProjectSession();

  const [currentPage, setCurrentPage] = useState<Page>("welcome");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [hasInviteToken, setHasInviteToken] = useState(false);
  // Track whether we've already resolved the initial navigation after login
  const [initialNavDone, setInitialNavDone] = useState(false);

  const isAuthenticated = !!identity;
  const profileReady = isAuthenticated && !profileLoading && isFetched;
  const showProfileSetup = profileReady && userProfile === null;

  // Check for invite token on mount
  useEffect(() => {
    const inviteToken = getUrlParameter("invite");
    if (inviteToken) {
      setHasInviteToken(true);
    }
  }, []);

  // Initial navigation: runs once after profile + projects are loaded
  useEffect(() => {
    if (!profileReady || userProfile === null) return; // wait for profile
    if (projectsLoading) return; // wait for projects
    if (initialNavDone) return; // only run once per session

    setInitialNavDone(true);

    // If there's a saved last-used project and it exists in top-level projects → auto-load it
    if (lastUsedProjectId && projects && projects.length > 0) {
      const found = projects.find((p) => p.id === lastUsedProjectId);
      if (found) {
        setCurrentProjectId(lastUsedProjectId);
        setCurrentPage("dashboard");
        return;
      }
      // Saved project no longer exists or is a phase — clear it and fall through to welcome
      clearLastUsedProjectId();
    }

    // Otherwise always show welcome screen so user can choose a project
    setCurrentPage("welcome");
  }, [
    profileReady,
    userProfile,
    projectsLoading,
    projects,
    lastUsedProjectId,
    initialNavDone,
    clearLastUsedProjectId,
  ]);

  // Reset initialNavDone on logout so the logic runs again on next login
  const handleLogout = async () => {
    await clear();
    qc.clear();
    clearLastUsedProjectId();
    setCurrentProjectId(null);
    setCurrentPage("welcome");
    setInitialNavDone(false);
  };

  // Listen for navigation events dispatched from child components
  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        page: Page;
        filter?: string;
        projectId?: string;
      }>;
      if (customEvent.detail?.page) {
        setCurrentPage(customEvent.detail.page);
      }
    };
    window.addEventListener("navigate", handleNavigate);
    return () => window.removeEventListener("navigate", handleNavigate);
  }, []);

  // Handle navigation from WelcomeScreen / ProjectSelection
  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  // Handle project selection (from dropdown or ProjectSelection page)
  const handleProjectSelect = (projectId: string | null) => {
    setCurrentProjectId(projectId);
    if (projectId) {
      setLastUsedProjectId(projectId);
      setCurrentPage("dashboard");
    }
  };

  // Called after a new project is created from WelcomeScreen
  const handleProjectCreated = (projectId: string) => {
    setCurrentProjectId(projectId);
    setLastUsedProjectId(projectId);
    setCurrentPage("dashboard");
  };

  // ---- Render tree ----

  // Handle invite link flow
  if (hasInviteToken) {
    return (
      <ApplyInvite
        onSuccess={(projectId) => {
          setHasInviteToken(false);
          if (projectId) {
            setLastUsedProjectId(projectId);
            setCurrentProjectId(projectId);
            setCurrentPage("dashboard");
          } else {
            setCurrentPage("contacts");
          }
        }}
      />
    );
  }

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Wird geladen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (showProfileSetup) {
    return <ProfileSetupModal />;
  }

  // Show loading indicator while we wait for initial navigation decision
  if (!initialNavDone && profileReady && userProfile !== null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Projekte werden geladen...</p>
        </div>
      </div>
    );
  }

  // Project selection page
  if (currentPage === "project-selection") {
    return (
      <ProjectSelection
        onNavigate={handleNavigate}
        onBack={() => setCurrentPage("welcome")}
        onProjectSelect={handleProjectSelect}
      />
    );
  }

  // Welcome screen
  if (currentPage === "welcome") {
    return (
      <WelcomeScreen
        onNavigate={handleNavigate}
        onProjectCreated={handleProjectCreated}
      />
    );
  }

  // Main app layout
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard currentProjectId={currentProjectId} />;
      case "roadmap":
        return <Roadmap currentProjectId={currentProjectId} />;
      case "tasks":
        return <Tasks currentProjectId={currentProjectId} />;
      case "documents":
        return <Documents currentProjectId={currentProjectId} />;
      case "media":
        return <Media currentProjectId={currentProjectId} />;
      case "contacts":
        return <Contacts />;
      case "kostenuebersicht":
        return <Kostenuebersicht currentProjectId={currentProjectId} />;
      default:
        return <Dashboard currentProjectId={currentProjectId} />;
    }
  };

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      currentProjectId={currentProjectId}
      onProjectSelect={handleProjectSelect}
      onLogout={handleLogout}
    >
      <ErrorBoundary>{renderPage()}</ErrorBoundary>
    </AppLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AppContent />
        <Toaster />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
