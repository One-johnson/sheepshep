"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import {
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

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string | null;
}

export function GlobalSearch({ open, onOpenChange, token }: GlobalSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch search results
  const members = useQuery(
    api.members.list,
    token && searchQuery.length > 0 ? { token } : "skip"
  );

  // Get all users and filter by role
  const allUsers = useQuery(
    api.authUsers.list,
    token && searchQuery.length > 0 ? { token } : "skip"
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
    if (!members || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(query) ||
        member.preferredName?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query) ||
        member.phone?.toLowerCase().includes(query) ||
        member.customId?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  const filteredShepherds = React.useMemo(() => {
    if (!shepherds || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return shepherds.filter(
      (shepherd) =>
        shepherd.name.toLowerCase().includes(query) ||
        shepherd.preferredName?.toLowerCase().includes(query) ||
        shepherd.email.toLowerCase().includes(query) ||
        shepherd.phone?.toLowerCase().includes(query)
    );
  }, [shepherds, searchQuery]);

  const filteredPastors = React.useMemo(() => {
    if (!pastors || !searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return pastors.filter(
      (pastor) =>
        pastor.name.toLowerCase().includes(query) ||
        pastor.preferredName?.toLowerCase().includes(query) ||
        pastor.email.toLowerCase().includes(query) ||
        pastor.phone?.toLowerCase().includes(query)
    );
  }, [pastors, searchQuery]);

  const handleSelect = (type: string, id: string) => {
    onOpenChange(false);
    setSearchQuery("");
    if (type === "member") {
      router.push(`/dashboard/users?memberId=${id}`);
    } else if (type === "shepherd") {
      router.push(`/dashboard/users?shepherdId=${id}`);
    } else if (type === "pastor") {
      router.push(`/dashboard/users?pastorId=${id}`);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search members, shepherds, pastors..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {filteredMembers && filteredMembers.length > 0 && (
          <CommandGroup heading="Members">
            {filteredMembers.slice(0, 5).map((member) => (
              <CommandItem
                key={member._id}
                value={`member-${member._id}`}
                onSelect={() => handleSelect("member", member._id)}
              >
                <UserCog className="mr-2 h-4 w-4" />
                <span>{member.preferredName || member.name}</span>
                {member.customId && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({member.customId})
                  </span>
                )}
              </CommandItem>
            ))}
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
            {filteredShepherds.slice(0, 5).map((shepherd) => (
              <CommandItem
                key={shepherd._id}
                value={`shepherd-${shepherd._id}`}
                onSelect={() => handleSelect("shepherd", shepherd._id)}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>{shepherd.preferredName || shepherd.name}</span>
              </CommandItem>
            ))}
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
            {filteredPastors.slice(0, 5).map((pastor) => (
              <CommandItem
                key={pastor._id}
                value={`pastor-${pastor._id}`}
                onSelect={() => handleSelect("pastor", pastor._id)}
              >
                <UserCheck className="mr-2 h-4 w-4" />
                <span>{pastor.preferredName || pastor.name}</span>
              </CommandItem>
            ))}
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
  );
}
