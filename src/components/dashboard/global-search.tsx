"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Users,
  UserCheck,
  UserCog,
  Calendar,
  UsersRound,
  FileText,
} from "lucide-react";
import { ViewMemberDialog } from "./view-member-dialog";
import { ViewUserDialog } from "./view-user-dialog";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
}

export function GlobalSearch({ open, onOpenChange, token }: GlobalSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedMemberId, setSelectedMemberId] = React.useState<Id<"members"> | null>(null);
  const [selectedUserId, setSelectedUserId] = React.useState<Id<"users"> | null>(null);

  // Fetch search results - fetch when dialog is open
  const members = useQuery(
    api.members.list,
    token && open ? { token } : "skip"
  );

  // Get all users and filter by role - fetch when dialog is open
  const allUsers = useQuery(
    api.authUsers.list,
    token && open ? { token } : "skip"
  );

  const shepherds = React.useMemo(() => {
    if (!allUsers) return undefined;
    return allUsers.filter((user) => user.role === "shepherd" && user.isActive);
  }, [allUsers]);

  const pastors = React.useMemo(() => {
    if (!allUsers) return undefined;
    return allUsers.filter((user) => user.role === "pastor" && user.isActive);
  }, [allUsers]);

  // Filter results based on search query
  const filteredMembers = React.useMemo(() => {
    if (!members || !searchQuery || searchQuery.trim().length === 0) return [];
    const query = searchQuery.toLowerCase().trim();
    return members.filter(
      (member) => {
        const fullName = `${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();
        return (
          fullName.includes(query) ||
          (member.firstName && member.firstName.toLowerCase().includes(query)) ||
          (member.lastName && member.lastName.toLowerCase().includes(query)) ||
          (member.preferredName && member.preferredName.toLowerCase().includes(query)) ||
          (member.email && member.email.toLowerCase().includes(query)) ||
          (member.phone && member.phone.toLowerCase().includes(query)) ||
          (member.customId && member.customId.toLowerCase().includes(query))
        );
      }
    );
  }, [members, searchQuery]);

  const filteredShepherds = React.useMemo(() => {
    if (!shepherds || !searchQuery || searchQuery.trim().length === 0) return [];
    const query = searchQuery.toLowerCase().trim();
    return shepherds.filter(
      (shepherd) =>
        (shepherd.name && shepherd.name.toLowerCase().includes(query)) ||
        (shepherd.preferredName && shepherd.preferredName.toLowerCase().includes(query)) ||
        (shepherd.email && shepherd.email.toLowerCase().includes(query)) ||
        (shepherd.phone && shepherd.phone.toLowerCase().includes(query))
    );
  }, [shepherds, searchQuery]);

  const filteredPastors = React.useMemo(() => {
    if (!pastors || !searchQuery || searchQuery.trim().length === 0) return [];
    const query = searchQuery.toLowerCase().trim();
    return pastors.filter(
      (pastor) =>
        (pastor.name && pastor.name.toLowerCase().includes(query)) ||
        (pastor.preferredName && pastor.preferredName.toLowerCase().includes(query)) ||
        (pastor.email && pastor.email.toLowerCase().includes(query)) ||
        (pastor.phone && pastor.phone.toLowerCase().includes(query))
    );
  }, [pastors, searchQuery]);

  // Fetch selected member data
  const selectedMember = useQuery(
    api.members.getById,
    token && selectedMemberId ? { token, memberId: selectedMemberId } : "skip"
  );

  // Get selected user from the already fetched list
  const selectedUser = React.useMemo(() => {
    if (!selectedUserId || !allUsers) return null;
    return allUsers.find((u) => u._id === selectedUserId) || null;
  }, [selectedUserId, allUsers]);

  const handleSelect = (type: string, id: string) => {
    onOpenChange(false);
    setSearchQuery("");
    if (type === "member") {
      setSelectedMemberId(id as Id<"members">);
      setSelectedUserId(null);
    } else if (type === "shepherd" || type === "pastor") {
      setSelectedUserId(id as Id<"users">);
      setSelectedMemberId(null);
    }
  };

  // Reset search when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const isLoading = (open && token && (members === undefined || allUsers === undefined));
  const hasResults = 
    (filteredMembers && filteredMembers.length > 0) ||
    (filteredShepherds && filteredShepherds.length > 0) ||
    (filteredPastors && filteredPastors.length > 0);

  return (
    <>
    <CommandDialog open={open} onOpenChange={onOpenChange} shouldFilter={false}>
      <CommandInput
        placeholder="Search members, shepherds, pastors..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        {isLoading && (
          <CommandEmpty>Loading...</CommandEmpty>
        )}
        {!isLoading && !hasResults && searchQuery && searchQuery.trim().length > 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
        {!isLoading && !searchQuery && (
          <CommandEmpty>Start typing to search...</CommandEmpty>
        )}

        {filteredMembers && filteredMembers.length > 0 && (
          <CommandGroup heading="Members">
            {filteredMembers.slice(0, 5).map((member) => {
              const searchableText = [
                member.firstName,
                member.lastName,
                member.preferredName,
                member.email,
                member.phone,
                member.customId,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              
              return (
                <CommandItem
                  key={member._id}
                  value={`member-${member._id} ${searchableText}`}
                  onSelect={() => handleSelect("member", member._id)}
                >
                  <UserCog className="mr-2 h-4 w-4" />
                  <span>{member.preferredName || `${member.firstName} ${member.lastName}`}</span>
                  {member.customId && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({member.customId})
                    </span>
                  )}
                </CommandItem>
              );
            })}
            {filteredMembers.length > 5 && (
              <CommandItem
                onSelect={() => {
                  onOpenChange(false);
                  router.push(`/dashboard/users?search=${encodeURIComponent(searchQuery)}&type=member`);
                }}
              >
                <span className="text-xs text-muted-foreground">
                  View all {filteredMembers.length} members...
                </span>
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {filteredShepherds && filteredShepherds.length > 0 && (
          <CommandGroup heading="Shepherds">
            {filteredShepherds.slice(0, 5).map((shepherd) => {
              const searchableText = [
                shepherd.name,
                shepherd.preferredName,
                shepherd.email,
                shepherd.phone,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              
              return (
                <CommandItem
                  key={shepherd._id}
                  value={`shepherd-${shepherd._id} ${searchableText}`}
                  onSelect={() => handleSelect("shepherd", shepherd._id)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>{shepherd.preferredName || shepherd.name}</span>
                </CommandItem>
              );
            })}
            {filteredShepherds.length > 5 && (
              <CommandItem
                onSelect={() => {
                  onOpenChange(false);
                  router.push(`/dashboard/users?search=${encodeURIComponent(searchQuery)}&type=shepherd`);
                }}
              >
                <span className="text-xs text-muted-foreground">
                  View all {filteredShepherds.length} shepherds...
                </span>
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {filteredPastors && filteredPastors.length > 0 && (
          <CommandGroup heading="Pastors">
            {filteredPastors.slice(0, 5).map((pastor) => {
              const searchableText = [
                pastor.name,
                pastor.preferredName,
                pastor.email,
                pastor.phone,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              
              return (
                <CommandItem
                  key={pastor._id}
                  value={`pastor-${pastor._id} ${searchableText}`}
                  onSelect={() => handleSelect("pastor", pastor._id)}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  <span>{pastor.preferredName || pastor.name}</span>
                </CommandItem>
              );
            })}
            {filteredPastors.length > 5 && (
              <CommandItem
                onSelect={() => {
                  onOpenChange(false);
                  router.push(`/dashboard/users?search=${encodeURIComponent(searchQuery)}&type=pastor`);
                }}
              >
                <span className="text-xs text-muted-foreground">
                  View all {filteredPastors.length} pastors...
                </span>
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              router.push("/dashboard/users");
            }}
          >
            <Users className="mr-2 h-4 w-4" />
            <span>View All Users</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              router.push("/dashboard/notifications");
            }}
          >
            <Calendar className="mr-2 h-4 w-4" />
            <span>Notifications</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>

    {/* Member Detail Dialog */}
    {selectedMember && (
      <ViewMemberDialog
        open={!!selectedMember}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMemberId(null);
          }
        }}
        member={selectedMember}
      />
    )}

    {/* User Detail Dialog */}
    {selectedUser && (
      <ViewUserDialog
        open={!!selectedUser}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
          }
        }}
        user={selectedUser}
      />
    )}
    </>
  );
}
