import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Euro,
  FileText,
  Heart,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  Users,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import CreateProjectDialog from "./CreateProjectDialog";
import ProjectDropdown from "./ProjectDropdown";

type Page =
  | "dashboard"
  | "roadmap"
  | "tasks"
  | "documents"
  | "media"
  | "contacts"
  | "kostenuebersicht";

interface AppLayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  currentProjectId: string | null;
  onProjectSelect: (projectId: string | null) => void;
  onLogout: () => void;
}

export default function AppLayout({
  children,
  currentPage,
  onNavigate,
  currentProjectId,
  onProjectSelect,
  onLogout,
}: AppLayoutProps) {
  const { data: userProfile } = useGetCallerUserProfile();
  const { theme, setTheme } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] =
    useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
    { id: "roadmap" as Page, label: "Roadmap", icon: Calendar },
    { id: "tasks" as Page, label: "Aufgaben", icon: CheckSquare },
    { id: "documents" as Page, label: "Dokumente", icon: FileText },
    { id: "media" as Page, label: "Medien", icon: Image },
    { id: "contacts" as Page, label: "Kontakte", icon: Users },
    { id: "kostenuebersicht" as Page, label: "Kostenübersicht", icon: Euro },
  ];

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleCreateNewProject = () => {
    setIsCreateProjectDialogOpen(true);
  };

  const getAppIdentifier = () => {
    try {
      return encodeURIComponent(window.location.hostname || "umbau-manager");
    } catch {
      return "umbau-manager";
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar - Offcanvas */}
      {!isMobile && (
        <aside
          className={cn(
            "flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
            isSidebarOpen ? "w-64" : "w-0",
          )}
        >
          <div
            className={cn(
              "flex flex-col h-full",
              !isSidebarOpen && "opacity-0",
            )}
          >
            <div className="border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold truncate">Umbau Manager</h2>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    currentPage === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="border-t p-4">
              <p className="text-xs text-muted-foreground text-center">
                © {new Date().getFullYear()}. Built with{" "}
                <Heart className="inline h-3 w-3 text-red-500" /> using{" "}
                <a
                  href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${getAppIdentifier()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  caffeine.ai
                </a>
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* Sidebar Toggle Button (Desktop) */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-card border border-l-0 rounded-r-lg p-2 shadow-md hover:bg-accent transition-colors"
          style={{
            left: isSidebarOpen ? "256px" : "0px",
            transition: "left 300ms ease-in-out",
          }}
        >
          {isSidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Menü schließen"
            className="fixed inset-0 bg-black/50 z-40 lg:hidden cursor-default"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r z-50 flex flex-col lg:hidden">
            <div className="border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Umbau Manager</h2>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 hover:bg-accent rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    currentPage === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="border-t p-4">
              <p className="text-xs text-muted-foreground text-center">
                © {new Date().getFullYear()}. Built with{" "}
                <Heart className="inline h-3 w-3 text-red-500" /> using{" "}
                <a
                  href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${getAppIdentifier()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  caffeine.ai
                </a>
              </p>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 hover:bg-accent rounded-md lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-xl font-semibold capitalize">
              {menuItems.find((item) => item.id === currentPage)?.label ||
                "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Project Dropdown */}
            <ProjectDropdown
              currentProjectId={currentProjectId}
              onProjectSelect={onProjectSelect}
              onCreateNew={handleCreateNewProject}
            />

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userProfile ? getInitials(userProfile.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {userProfile?.name || "User"}
                    </p>
                    {userProfile?.email && (
                      <p className="text-xs leading-none text-muted-foreground">
                        {userProfile.email}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onLogout}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Abmelden</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={isCreateProjectDialogOpen}
        onOpenChange={setIsCreateProjectDialogOpen}
        onSuccess={(projectId) => {
          onProjectSelect(projectId);
          setIsCreateProjectDialogOpen(false);
        }}
      />
    </div>
  );
}
