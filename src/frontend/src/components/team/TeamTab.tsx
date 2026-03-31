import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Principal } from "@icp-sdk/core/principal";
import { Edit, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { TeamMember } from "../../backend";
import { UserRole } from "../../backend";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useIsCurrentUserAdmin,
  useListTeamMembers,
  useRemoveTeamMember,
  useUpdateTeamMemberRole,
} from "../../hooks/useQueries";
import InviteMemberDialog from "./InviteMemberDialog";

export default function TeamTab() {
  const { identity } = useInternetIdentity();
  const { data: isAdmin = false, isLoading: adminLoading } =
    useIsCurrentUserAdmin();
  const { data: teamMembers = [], isLoading: membersLoading } =
    useListTeamMembers();
  const { data: userProfile } = useGetCallerUserProfile();
  const removeTeamMember = useRemoveTeamMember();
  const updateTeamMemberRole = useUpdateTeamMemberRole();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.user);

  const currentPrincipal = identity?.getPrincipal().toString();

  const handleRemoveMember = async () => {
    if (!removeMemberId) return;
    try {
      const principal = Principal.fromText(removeMemberId);
      await removeTeamMember.mutateAsync(principal);
      setRemoveMemberId(null);
    } catch (error) {
      console.error("Remove member error:", error);
    }
  };

  const handleUpdateRole = async (memberId: string) => {
    try {
      const principal = Principal.fromText(memberId);
      await updateTeamMemberRole.mutateAsync({ principal, role: newRole });
      setEditingMemberId(null);
    } catch (error) {
      console.error("Update role error:", error);
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case UserRole.admin:
        return "default";
      case UserRole.user:
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.admin:
        return "Admin";
      case UserRole.user:
        return "Member - Can Edit";
      case UserRole.guest:
        return "Viewer - Read Only";
      default:
        return role;
    }
  };

  const getMemberName = (member: TeamMember): string => {
    const principalStr = member.principal.toString();

    // If this is the current user and we have a profile, use the profile name
    if (principalStr === currentPrincipal && userProfile?.name) {
      return userProfile.name;
    }

    // Otherwise show truncated principal
    return principalStr.length > 20
      ? `${principalStr.slice(0, 8)}...${principalStr.slice(-8)}`
      : principalStr;
  };

  if (adminLoading || membersLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p>Lade Team-Mitglieder...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Keine Berechtigung</p>
            <p className="text-sm mt-2">
              Nur Administratoren können Team-Mitglieder verwalten
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Teammitglieder verwalten</h2>
          <p className="text-muted-foreground mt-1">
            Laden Sie neue Mitglieder mit einem Einladungslink ein
          </p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Mitglied einladen
        </Button>
      </div>

      {teamMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Teammitglieder</p>
              <p className="text-sm mt-2">Laden Sie das erste Mitglied ein</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => {
            const isCurrentUser =
              member.principal.toString() === currentPrincipal;
            const isEditing = editingMemberId === member.principal.toString();

            return (
              <Card
                key={member.principal.toString()}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate flex items-center gap-2">
                        {getMemberName(member)}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            Du
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={newRole}
                              onValueChange={(value) =>
                                setNewRole(value as UserRole)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={UserRole.admin}>
                                  Admin
                                </SelectItem>
                                <SelectItem value={UserRole.user}>
                                  Member - Can Edit
                                </SelectItem>
                                <SelectItem value={UserRole.guest}>
                                  Viewer - Read Only
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleUpdateRole(member.principal.toString())
                              }
                              disabled={updateTeamMemberRole.isPending}
                            >
                              Speichern
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingMemberId(null)}
                            >
                              Abbrechen
                            </Button>
                          </div>
                        ) : (
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {getRoleLabel(member.role)}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    {!isCurrentUser && !isEditing && (
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingMemberId(member.principal.toString());
                            setNewRole(member.role);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setRemoveMemberId(member.principal.toString())
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {member.principal.toString()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />

      {/* Remove Member Confirmation */}
      <AlertDialog
        open={!!removeMemberId}
        onOpenChange={(open) => !open && setRemoveMemberId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mitglied entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sind Sie sicher, dass Sie dieses Mitglied aus dem Team entfernen
              möchten? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeTeamMember.isPending}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
