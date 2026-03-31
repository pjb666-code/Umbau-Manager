import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  CostItem,
  Document,
  KostenUebersicht,
  Media,
  MediaPositionUpdate,
  MediaUpdate,
  Project,
  Task,
  TeamMember,
  UserProfile,
  UserType,
} from "../backend";
import { UserRole } from "../backend";
import { useActor } from "./useActor";

// ============================================================================
// Type Definitions
// ============================================================================

export type Kontakt = {
  id: string;
  name: string;
  firma: string;
  rolle: string;
  email: string;
  telefon: string;
  notizen: string;
  verknuepfteTasks: string[];
  verknuepfteDokumente: string[];
  owner: Principal;
};

export type HilfreicherLink = {
  id: string;
  titel: string;
  beschreibung: string;
  url: string;
  kategorie: string;
  logoUrl: string;
  owner: Principal;
};

// Aliases for backward compatibility
export type Dokument = Document;
export type Medium = Media;

// ============================================================================
// User Profile Queries
// ============================================================================

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      toast.success("Profile saved successfully");
    },
    onError: (error: Error) => {
      console.error("Save profile error:", error);
      toast.error("Failed to save profile");
    },
  });
}

// ============================================================================
// Team Association Queries
// ============================================================================

export function useHasTeamAssociation() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<boolean>({
    queryKey: ["hasTeamAssociation"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      try {
        const teamMembers = await actor.listTeamMembers();
        return teamMembers.length > 0;
      } catch (_error) {
        // If user is not admin, they can't list team members
        // Check if they have a role assigned
        const role = await actor.getCallerUserRole();
        return role === UserRole.user || role === UserRole.admin;
      }
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useCreateFamily() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      // Initialize access control makes the caller the first admin
      await actor.initializeAccessControl();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hasTeamAssociation"] });
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt erfolgreich erstellt");
    },
    onError: (error: Error) => {
      console.error("Create project error:", error);
      toast.error("Fehler beim Erstellen des Projekts");
    },
  });
}

export function useJoinFamily() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.claimInviteToken(inviteCode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hasTeamAssociation"] });
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Erfolgreich dem Projekt beigetreten");
    },
    onError: (error: Error) => {
      console.error("Join project error:", error);
      throw error; // Re-throw to handle in component
    },
  });
}

// ============================================================================
// Task Queries
// ============================================================================

export function useGetAllTasks() {
  const { actor, isFetching } = useActor();

  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTasks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTasksByProject(projectId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Task[]>({
    queryKey: ["tasks", "byProject", projectId],
    queryFn: async () => {
      if (!actor) return [];
      if (!projectId) return [];
      try {
        const projectTasks = await (actor as any).getTasksByProject(projectId);
        let phaseTasks: Task[] = [];
        try {
          const phases = await actor.getPhasesByProject(projectId);
          for (const phase of phases) {
            try {
              const tasks = await (actor as any).getTasksByProject(phase.id);
              phaseTasks = [...phaseTasks, ...tasks];
            } catch (_) {}
          }
        } catch (_) {}
        const seen = new Set<string>();
        const combined = [...(projectTasks || []), ...phaseTasks].filter(
          (t) => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          },
        );
        return combined;
      } catch (_) {
        const all = await actor.getAllTasks();
        let phaseIds = new Set<string>();
        try {
          const phases = await actor.getPhasesByProject(projectId);
          for (const p of phases) phaseIds.add(p.id);
        } catch (_2) {}
        return all.filter((t) => {
          if (!t.projectId) return false;
          return t.projectId === projectId || phaseIds.has(t.projectId);
        });
      }
    },
    enabled: !!actor && !isFetching,
  });
}
export function useCreateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      titel: string;
      beschreibung: string;
      gewerke: string;
      status: string;
      dringlichkeit: bigint;
      bereich: string;
      faelligkeit: bigint;
      kategorie: string;
      verantwortlicherKontakt: string | null;
      projectId: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createTask(
        params.id,
        params.titel,
        params.beschreibung,
        params.gewerke,
        params.status,
        params.dringlichkeit,
        params.bereich,
        params.faelligkeit,
        params.kategorie,
        params.verantwortlicherKontakt,
        params.projectId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created successfully");
    },
    onError: (error: Error) => {
      console.error("Create task error:", error);
      toast.error("Failed to create task");
    },
  });
}

export function useUpdateTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      titel: string;
      beschreibung: string;
      gewerke: string;
      status: string;
      dringlichkeit: bigint;
      bereich: string;
      faelligkeit: bigint;
      kategorie: string;
      verantwortlicherKontakt: string | null;
      projectId: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateTask(
        params.id,
        params.titel,
        params.beschreibung,
        params.gewerke,
        params.status,
        params.dringlichkeit,
        params.bereich,
        params.faelligkeit,
        params.kategorie,
        params.verantwortlicherKontakt,
        params.projectId,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated successfully");
    },
    onError: (error: Error) => {
      console.error("Update task error:", error);
      toast.error("Failed to update task");
    },
  });
}

export function useDeleteTask() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteTask(taskId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Delete task error:", error);
      toast.error("Failed to delete task");
    },
  });
}

export function useChangeTaskStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      newStatus,
    }: { taskId: string; newStatus: string }) => {
      if (!actor) throw new Error("Actor not available");
      const task = await actor.getTask(taskId);
      await actor.updateTask(
        taskId,
        task.titel,
        task.beschreibung,
        task.gewerke,
        newStatus,
        task.dringlichkeit,
        task.bereich,
        task.faelligkeit,
        task.kategorie,
        task.verantwortlicherKontakt || null,
        task.projectId || null,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task status updated");
    },
    onError: (error: Error) => {
      console.error("Change task status error:", error);
      toast.error("Failed to update task status");
    },
  });
}

// ============================================================================
// Project Queries
// ============================================================================

export function useGetAllProjects() {
  const { actor, isFetching } = useActor();

  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProjects();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTopLevelProjects() {
  const { actor, isFetching } = useActor();

  return useQuery<Project[]>({
    queryKey: ["topLevelProjects"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTopLevelProjects();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPhasesByProject(parentId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Project[]>({
    queryKey: ["phases", parentId],
    queryFn: async () => {
      if (!actor || !parentId) return [];
      return actor.getPhasesByProject(parentId);
    },
    enabled: !!actor && !isFetching && !!parentId,
  });
}
export function useCreateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      kunde: string | null;
      color: string;
      start: bigint | null;
      end: bigint | null;
      kategorie: string;
      verantwortlicherKontakt: string | null;
      costItems: CostItem[];
      parentProjectId?: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createProjekt(
        params.id,
        params.name,
        params.kunde,
        params.color,
        params.start,
        params.end,
        params.kategorie,
        params.verantwortlicherKontakt,
        params.costItems,
        params.parentProjectId !== undefined ? params.parentProjectId : null,
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["topLevelProjects"] });
      queryClient.invalidateQueries({ queryKey: ["phases"] });
      queryClient.invalidateQueries({ queryKey: ["costItems"] });
      queryClient.invalidateQueries({ queryKey: ["kostenUebersicht"] });
      if (variables.parentProjectId) {
        toast.success("Phase erfolgreich hinzugefügt");
      } else {
        toast.success("Projekt erfolgreich erstellt");
      }
    },
    onError: (error: Error) => {
      console.error("Create project error:", error);
      toast.error("Fehler beim Erstellen");
    },
  });
}

export function useUpdateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      kunde: string | null;
      color: string;
      start: bigint | null;
      end: bigint | null;
      kategorie: string;
      verantwortlicherKontakt: string | null;
      costItems: CostItem[];
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateProjekt(
        params.id,
        params.name,
        params.kunde,
        params.color,
        params.start,
        params.end,
        params.kategorie,
        params.verantwortlicherKontakt,
        params.costItems,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["costItems"] });
      queryClient.invalidateQueries({ queryKey: ["kostenUebersicht"] });
      toast.success("Projekt erfolgreich aktualisiert");
    },
    onError: (error: Error) => {
      console.error("Update project error:", error);
      toast.error("Failed to update project");
    },
  });
}

export function useDeleteProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteProjekt(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["costItems"] });
      queryClient.invalidateQueries({ queryKey: ["kostenUebersicht"] });
      toast.success("Erfolgreich gelöscht");
    },
    onError: (error: Error) => {
      console.error("Delete project error:", error);
      toast.error("Failed to delete project");
    },
  });
}

// ============================================================================
// Contact Queries
// ============================================================================

export function useGetAllContacts() {
  const { actor, isFetching } = useActor();

  return useQuery<Kontakt[]>({
    queryKey: ["contacts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllContacts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      firma: string;
      rolle: string;
      email: string;
      telefon: string;
      notizen: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createContact(
        params.id,
        params.name,
        params.firma,
        params.rolle,
        params.email,
        params.telefon,
        params.notizen,
        [], // verknuepfteTasks
        [], // verknuepfteDokumente
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Kontakt erfolgreich erstellt");
    },
    onError: (error: Error) => {
      console.error("Create contact error:", error);
      toast.error("Fehler beim Erstellen des Kontakts");
    },
  });
}

export function useUpdateContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      firma: string;
      rolle: string;
      email: string;
      telefon: string;
      notizen: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      // Get existing contact to preserve linked tasks and documents
      const existingContact = await actor.getContact(params.id);
      await actor.updateContact(
        params.id,
        params.name,
        params.firma,
        params.rolle,
        params.email,
        params.telefon,
        params.notizen,
        existingContact.verknuepfteTasks,
        existingContact.verknuepfteDokumente,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Kontakt erfolgreich aktualisiert");
    },
    onError: (error: Error) => {
      console.error("Update contact error:", error);
      toast.error("Fehler beim Aktualisieren des Kontakts");
    },
  });
}

export function useDeleteContact() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteContact(contactId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Kontakt erfolgreich gelöscht");
    },
    onError: (error: Error) => {
      console.error("Delete contact error:", error);
      toast.error("Fehler beim Löschen des Kontakts");
    },
  });
}

// ============================================================================
// Helpful Links Queries
// ============================================================================

export function useGetAllHelpfulLinks() {
  const { actor, isFetching } = useActor();

  return useQuery<HilfreicherLink[]>({
    queryKey: ["helpfulLinks"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllHelpfulLinks();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateHelpfulLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      titel: string;
      beschreibung: string;
      url: string;
      kategorie: string;
      logoUrl: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createHelpfulLink(
        params.id,
        params.titel,
        params.beschreibung,
        params.url,
        params.kategorie,
        params.logoUrl,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpfulLinks"] });
      toast.success("Link erfolgreich erstellt");
    },
    onError: (error: Error) => {
      console.error("Create link error:", error);
      toast.error("Fehler beim Erstellen des Links");
    },
  });
}

export function useUpdateHelpfulLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      titel: string;
      beschreibung: string;
      url: string;
      kategorie: string;
      logoUrl: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateHelpfulLink(
        params.id,
        params.titel,
        params.beschreibung,
        params.url,
        params.kategorie,
        params.logoUrl,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpfulLinks"] });
      toast.success("Link erfolgreich aktualisiert");
    },
    onError: (error: Error) => {
      console.error("Update link error:", error);
      toast.error("Fehler beim Aktualisieren des Links");
    },
  });
}

export function useDeleteHelpfulLink() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteHelpfulLink(linkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpfulLinks"] });
      toast.success("Link erfolgreich gelöscht");
    },
    onError: (error: Error) => {
      console.error("Delete link error:", error);
      toast.error("Fehler beim Löschen des Links");
    },
  });
}

// Backward compatibility aliases
export const useGetAllLinks = useGetAllHelpfulLinks;
export const useCreateLink = useCreateHelpfulLink;
export const useUpdateLink = useUpdateHelpfulLink;
export const useDeleteLink = useDeleteHelpfulLink;

// ============================================================================
// Document Queries
// ============================================================================

export function useGetUserDocuments() {
  const { actor, isFetching } = useActor();

  return useQuery<Dokument[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserDocuments();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for backward compatibility
export const useGetAllDocuments = useGetUserDocuments;

export function useGetDocumentsByProject(projectId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Dokument[]>({
    queryKey: ["documents", "byProject", projectId],
    queryFn: async () => {
      if (!actor) return [];
      if (!projectId) return actor.getUserDocuments();
      return (actor as any).getDocumentsByProject(projectId);
    },
    enabled: !!actor && !isFetching,
  });
}
export function useUploadDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      bereich: string;
      typ: string;
      status: string;
      blob: any;
      projectId?: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await (actor as any).uploadDocumentWithPDF(
        params.id,
        params.name,
        params.bereich,
        params.typ,
        params.status,
        params.blob,
        params.projectId ?? null,
      );
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({
        queryKey: ["documents", "byProject", params.projectId ?? null],
      });
      toast.success("Document uploaded successfully");
    },
    onError: (error: Error) => {
      console.error("Upload document error:", error);
      toast.error(
        `Upload fehlgeschlagen: ${error.message || "Unbekannter Fehler"}`,
      );
    },
  });
}

export function useDeleteDocument() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteDocument(documentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Delete document error:", error);
      toast.error("Failed to delete document");
    },
  });
}

// ============================================================================
// Media Queries
// ============================================================================

export function useGetUserMedia() {
  const { actor, isFetching } = useActor();

  return useQuery<Medium[]>({
    queryKey: ["media"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserMedia();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for backward compatibility
export const useGetAllMedia = useGetUserMedia;

export function useGetMediaByProject(projectId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<Medium[]>({
    queryKey: ["media", "byProject", projectId],
    queryFn: async () => {
      if (!actor) return [];
      if (!projectId) return actor.getUserMedia();
      return actor.getMediaByProject(projectId);
    },
    enabled: !!actor && !isFetching,
  });
}
export function useUploadMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      kategorie: string;
      typ: string;
      position: bigint;
      tags: string[];
      blob: any;
      projectId?: string | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.uploadMedia(
        params.id,
        params.name,
        params.kategorie,
        params.typ,
        params.position,
        params.tags,
        params.blob,
        params.projectId ?? null,
      );
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({
        queryKey: ["media", "byProject", params.projectId ?? null],
      });
      toast.success("Media uploaded successfully");
    },
    onError: (error: Error) => {
      console.error("Upload media error:", error);
      toast.error(
        `Upload fehlgeschlagen: ${error.message || "Unbekannter Fehler"}`,
      );
    },
  });
}

export function useUpdateMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; updates: MediaUpdate }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateMedia(params.id, params.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success("Media updated successfully");
    },
    onError: (error: Error) => {
      console.error("Update media error:", error);
      toast.error("Failed to update media");
    },
  });
}

export function useBulkUpdateMediaPositions() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: MediaPositionUpdate[]) => {
      if (!actor) throw new Error("Actor not available");
      await actor.bulkUpdateMediaPositions(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success("Media positions updated");
    },
    onError: (error: Error) => {
      console.error("Bulk update media positions error:", error);
      toast.error("Failed to update media positions");
    },
  });
}

export function useDeleteMedia() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mediaId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteUserMedia(mediaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      toast.success("Media deleted successfully");
    },
    onError: (error: Error) => {
      console.error("Delete media error:", error);
      toast.error("Failed to delete media");
    },
  });
}

// ============================================================================
// Cost Item Queries
// ============================================================================

export function useGetAllCostItems() {
  const { actor, isFetching } = useActor();

  return useQuery<CostItem[]>({
    queryKey: ["costItems"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllKostenpunkte();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for backward compatibility
export const useGetAllKostenpunkte = useGetAllCostItems;

export function useGetCostItemsByProject() {
  const { actor, isFetching: _isFetching } = useActor();

  return useMutation({
    mutationFn: async (projectId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.getKostenpunkteByProjekt(projectId);
    },
  });
}

export function useGetCostItemsByProjectQuery(projectId: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<CostItem[]>({
    queryKey: ["costItems", "byProject", projectId],
    queryFn: async () => {
      if (!actor || !projectId) return [];
      return actor.getKostenpunkteByProjectAndPhases(projectId);
    },
    enabled: !!actor && !isFetching && !!projectId,
  });
}

export function useAddCostItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: string; costItem: CostItem }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.addKostenpunkt(params.projectId, params.costItem);
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ["costItems"] });
      queryClient.invalidateQueries({
        queryKey: ["costItems", "byProject", params.projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["kostenUebersicht"] });
      toast.success("Kostenpunkt erfolgreich hinzugefügt");
    },
    onError: (error: Error) => {
      console.error("Add cost item error:", error);
      toast.error(
        `Fehler beim Hinzufügen des Kostenpunkts: ${error?.message || ""}`,
      );
    },
  });
}

// Alias for backward compatibility
export const useAddKostenpunkt = useAddCostItem;

export function useUpdateCostItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      costId: string;
      costItem: CostItem;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateKostenpunkt(
        params.projectId,
        params.costId,
        params.costItem,
      );
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ["costItems"] });
      queryClient.invalidateQueries({
        queryKey: ["costItems", "byProject", params.projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["kostenUebersicht"] });
      toast.success("Kostenpunkt erfolgreich aktualisiert");
    },
    onError: (error: Error) => {
      console.error("Update cost item error:", error);
      toast.error("Fehler beim Aktualisieren des Kostenpunkts");
    },
  });
}

// Alias for backward compatibility
export const useUpdateKostenpunkt = useUpdateCostItem;

export function useDeleteCostItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { projectId: string; costItemId: string }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.deleteKostenpunkt(params.projectId, params.costItemId);
    },
    onSuccess: (_data, params) => {
      queryClient.invalidateQueries({ queryKey: ["costItems"] });
      queryClient.invalidateQueries({
        queryKey: ["costItems", "byProject", params.projectId],
      });
      queryClient.invalidateQueries({ queryKey: ["kostenUebersicht"] });
      toast.success("Kostenpunkt erfolgreich gelöscht");
    },
    onError: (error: Error) => {
      console.error("Delete cost item error:", error);
      toast.error("Fehler beim Löschen des Kostenpunkts");
    },
  });
}

// Alias for backward compatibility
export const useDeleteKostenpunkt = useDeleteCostItem;

export function useGetKostenUebersicht() {
  const { actor, isFetching: _isFetching } = useActor();

  return useMutation({
    mutationFn: async (projectId: string | null) => {
      if (!actor) throw new Error("Actor not available");
      return actor.getKostenUebersicht(projectId);
    },
  });
}

// ============================================================================
// Team Management Queries
// ============================================================================

export function useIsCurrentUserAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetTeamMembers() {
  const { actor, isFetching } = useActor();

  return useQuery<TeamMember[]>({
    queryKey: ["teamMembers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listTeamMembers();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for backward compatibility
export const useListTeamMembers = useGetTeamMembers;

export function useCreateInviteToken() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (role: UserRole) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createInviteToken(role);
    },
    onSuccess: () => {
      toast.success("Invite token created successfully");
    },
    onError: (error: Error) => {
      console.error("Create invite token error:", error);
      toast.error("Failed to create invite token");
    },
  });
}

export function useClaimInviteToken() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.claimInviteToken(token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hasTeamAssociation"] });
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Successfully joined the team");
    },
    onError: (error: Error) => {
      console.error("Claim invite token error:", error);
      throw error; // Re-throw to handle in component
    },
  });
}

export function useCreateInvite() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (params: { code: string; role: UserRole }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createInvite(params.code, params.role);
    },
    onSuccess: () => {
      toast.success("Invite code created successfully");
    },
    onError: (error: Error) => {
      console.error("Create invite error:", error);
      toast.error("Failed to create invite code");
    },
  });
}

export function useUpdateTeamMemberRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { principal: Principal; role: UserRole }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.updateTeamMemberRole(params.principal, params.role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      toast.success("Team member role updated successfully");
    },
    onError: (error: Error) => {
      console.error("Update team member role error:", error);
      toast.error("Failed to update team member role");
    },
  });
}

export function useRemoveTeamMember() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Actor not available");
      await actor.removeTeamMember(principal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      toast.success("Team member removed successfully");
    },
    onError: (error: Error) => {
      console.error("Remove team member error:", error);
      toast.error("Failed to remove team member");
    },
  });
}
