import { useEffect, useState } from "react";

const STORAGE_KEY = "umbau-manager-last-project-id";

export function useProjectSession() {
  const [lastUsedProjectId, setLastUsedProjectIdState] = useState<
    string | null
  >(null);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLastUsedProjectIdState(stored);
    }
  }, []);

  const setLastUsedProjectId = (projectId: string | null) => {
    if (projectId) {
      localStorage.setItem(STORAGE_KEY, projectId);
      setLastUsedProjectIdState(projectId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setLastUsedProjectIdState(null);
    }
  };

  const clearLastUsedProjectId = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLastUsedProjectIdState(null);
  };

  return {
    lastUsedProjectId,
    setLastUsedProjectId,
    clearLastUsedProjectId,
  };
}
