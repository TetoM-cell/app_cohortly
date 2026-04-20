"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isThisWeek, isToday, isYesterday } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  Inbox,
  Mail,
  MailOpen,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getDisplayName } from "@/lib/user-display";

import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ActivityItem = {
  id: string;
  type: "application" | "comment" | "invitation";
  created_at: string;
  program_id: string;
  program_name: string;
  applicant_name?: string;
  status?: string;
  commenter_name?: string;
  comment_text?: string;
  metadata?: InvitationMetadata;
};

type InvitationMetadata = {
  program_id?: string;
  cohort_name?: string;
  inviter_email?: string;
  role?: string;
};

type ProgramLookup = { name?: string | null } | Array<{ name?: string | null }> | null;

type ApplicationRow = {
  id: string;
  status?: string | null;
  applicant_name?: string | null;
  created_at: string;
  program_id: string;
  programs?: ProgramLookup;
};

type CommentRow = {
  id: string;
  text?: string | null;
  created_at: string;
  profiles?:
    | {
        full_name?: string | null;
        email?: string | null;
      }
    | Array<{
        full_name?: string | null;
        email?: string | null;
      }>
    | null;
  applications?:
    | {
        program_id?: string | null;
        programs?:
          | {
              name?: string | null;
            }
          | Array<{
              name?: string | null;
            }>
          | null;
      }
    | Array<{
        program_id?: string | null;
        programs?:
          | {
              name?: string | null;
            }
          | Array<{
              name?: string | null;
            }>
          | null;
      }>
    | null;
};

type NotificationRow = {
  id: string;
  created_at: string;
  message?: string | null;
  metadata?: InvitationMetadata | null;
};

const FILTER_TABS = [
  "All",
  "Unread",
  "Starred",
  "Applications",
  "Comments",
  "Invitations",
  "Archived",
] as const;

const AVATAR_TINTS = {
  application: [
    "bg-emerald-100 text-emerald-700",
    "bg-lime-100 text-lime-700",
    "bg-teal-100 text-teal-700",
    "bg-green-100 text-green-700",
    "bg-emerald-50 text-emerald-700",
  ],
  comment: [
    "bg-indigo-100 text-indigo-700",
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-blue-100 text-blue-700",
    "bg-fuchsia-100 text-fuchsia-700",
  ],
  invitation: [
    "bg-blue-100 text-blue-700",
    "bg-cyan-100 text-cyan-700",
    "bg-sky-100 text-sky-700",
    "bg-indigo-100 text-indigo-700",
    "bg-zinc-100 text-zinc-700",
  ],
} satisfies Record<ActivityItem["type"], string[]>;

function getSenderName(item: ActivityItem) {
  if (item.type === "application") return item.applicant_name || "Anonymous";
  return item.commenter_name || "Unknown";
}

function getSummaryText(item: ActivityItem) {
  if (item.type === "application") {
    return `submitted a new application for ${item.program_name}`;
  }

  if (item.type === "comment") {
    return `${item.comment_text || "Left a comment"} • ${item.program_name}`;
  }

  return `invited you to review ${item.program_name}`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}

function getAvatarClass(item: ActivityItem) {
  const sender = getSenderName(item);
  const code = sender.trim().toUpperCase().charCodeAt(0) || 65;
  const tintSet = AVATAR_TINTS[item.type];
  return tintSet[code % tintSet.length];
}

function getDateGroupLabel(dateString: string) {
  const date = new Date(dateString);

  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "This Week";
  return "Older";
}

function getStatusPillClass(status?: string) {
  if (status === "new") return "bg-blue-50 text-blue-700";
  if (status === "reviewing") return "bg-amber-50 text-amber-700";
  if (status === "accepted") return "bg-emerald-50 text-emerald-700";
  return "bg-zinc-100 text-zinc-500";
}

function getInboxSummaryText(item: ActivityItem) {
  return getSummaryText(item).replace("â€¢", "•");
}

function getInboxDateGroupLabel(dateString: string) {
  return getDateGroupLabel(dateString).replace("This Week", "This week");
}

export default function InboxPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [readItems, setReadItems] = useState<Set<string>>(new Set());
  const [archivedItems, setArchivedItems] = useState<Set<string>>(new Set());
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  const [starredItems, setStarredItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    const fetchInboxActivities = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        setUserId(user.id);

        try {
          const storedRead = localStorage.getItem(`cohortly_read_${user.id}`);
          if (storedRead) setReadItems(new Set(JSON.parse(storedRead)));
          const storedArchived = localStorage.getItem(`cohortly_archived_${user.id}`);
          if (storedArchived) setArchivedItems(new Set(JSON.parse(storedArchived)));
          const storedDeleted = localStorage.getItem(`cohortly_deleted_${user.id}`);
          if (storedDeleted) setDeletedItems(new Set(JSON.parse(storedDeleted)));
          const storedStarred = localStorage.getItem(`cohortly_starred_${user.id}`);
          if (storedStarred) setStarredItems(new Set(JSON.parse(storedStarred)));
        } catch {}

        const { data: programsData, error: programsError } = await supabase
          .from("programs")
          .select("id")
          .eq("owner_id", user.id);

        if (programsError) throw programsError;

        const programIds = (programsData || []).map((p) => p.id);
        const allActivities: ActivityItem[] = [];

        if (programIds.length > 0) {
          const { data: appsData } = await supabase
            .from("applications")
            .select(`
              id, 
              status, 
              applicant_name,
              created_at,
              program_id,
              programs (name)
            `)
            .in("program_id", programIds)
            .order("created_at", { ascending: false })
            .limit(100);

          if (appsData) {
            appsData.forEach((app: ApplicationRow) => {
              const progInfo = app.programs;
              const progName = Array.isArray(progInfo) ? progInfo[0]?.name : progInfo?.name;

              allActivities.push({
                id: `app_${app.id}`,
                type: "application",
                created_at: app.created_at,
                program_id: app.program_id,
                program_name: progName || "Unknown Program",
                applicant_name: app.applicant_name ?? undefined,
                status: app.status ?? undefined,
              });
            });
          }

          const appIdsForComments = appsData?.map((a) => a.id) || [];
          if (appIdsForComments.length > 0) {
            const { data: commentsData } = await supabase
              .from("comments")
              .select(`
                id,
                text,
                created_at,
                profiles (full_name, email),
                applications (program_id, programs (name))
              `)
              .in("application_id", appIdsForComments)
              .order("created_at", { ascending: false })
              .limit(100);

            if (commentsData) {
              commentsData.forEach((comment: CommentRow) => {
                const applicationInfo = Array.isArray(comment.applications)
                  ? comment.applications[0]
                  : comment.applications;
                const programInfo = Array.isArray(applicationInfo?.programs)
                  ? applicationInfo?.programs[0]
                  : applicationInfo?.programs;
                const profileInfo = Array.isArray(comment.profiles)
                  ? comment.profiles[0]
                  : comment.profiles;
                const progId = applicationInfo?.program_id;
                const progName = programInfo?.name || "Unknown Program";
                const userName = getDisplayName(profileInfo?.full_name, profileInfo?.email);

                if (progId) {
                  allActivities.push({
                    id: `comment_${comment.id}`,
                    type: "comment",
                    created_at: comment.created_at,
                    program_id: progId,
                    program_name: progName,
                    commenter_name: userName,
                    comment_text: comment.text ?? undefined,
                  });
                }
              });
            }
          }
        }

        const { data: notificationsData } = await supabase
          .from("notifications")
          .select("*")
          .eq("recipient_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (notificationsData) {
          notificationsData.forEach((notif: NotificationRow) => {
            allActivities.push({
              id: `notif_${notif.id}`,
              type: "invitation",
              created_at: notif.created_at,
              program_id: notif.metadata?.program_id || "",
              program_name: notif.metadata?.cohort_name || "Unknown Program",
              commenter_name: notif.metadata?.inviter_email ?? undefined,
              comment_text: notif.message ?? undefined,
              metadata: notif.metadata ?? undefined,
            });
          });
        }

        allActivities.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setActivities(allActivities);
      } catch (err) {
        console.error("Error fetching inbox:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInboxActivities();
  }, []);

  const saveState = (key: string, set: Set<string>) => {
    if (userId) {
      localStorage.setItem(`cohortly_${key}_${userId}`, JSON.stringify(Array.from(set)));
    }
  };

  const visibleActivities = useMemo(() => {
    return activities.filter((a) => {
      if (deletedItems.has(a.id)) return false;
      if (filter !== "Archived" && archivedItems.has(a.id)) return false;
      if (filter === "Archived" && !archivedItems.has(a.id)) return false;
      if (filter === "Unread" && readItems.has(a.id)) return false;
      if (filter === "Read" && !readItems.has(a.id)) return false;
      if (filter === "Starred" && !starredItems.has(a.id)) return false;
      if (filter === "Applications" && a.type !== "application") return false;
      if (filter === "Comments" && a.type !== "comment") return false;
      if (filter === "Invitations" && a.type !== "invitation") return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const searchText =
          `${a.applicant_name || ""} ${a.commenter_name || ""} ${a.comment_text || ""} ${a.program_name || ""}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      return true;
    });
  }, [activities, archivedItems, deletedItems, filter, readItems, searchQuery, starredItems]);

  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {
      Today: [],
      Yesterday: [],
      "This week": [],
      Older: [],
    };

    visibleActivities.forEach((item) => {
      groups[getInboxDateGroupLabel(item.created_at)].push(item);
    });

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([label, items]) => ({ label, items }));
  }, [visibleActivities]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const handleSelectAll = (ids: string[]) => {
    if (selectedItems.size === ids.length && ids.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(ids));
    }
  };

  const handleAction = (action: string) => {
    const targetItems =
      selectedItems.size > 0 ? Array.from(selectedItems) : visibleActivities.map((a) => a.id);
    if (targetItems.length === 0) return;

    if (action === "archive") {
      const next = new Set(archivedItems);
      targetItems.forEach((id) => next.add(id));
      setArchivedItems(next);
      saveState("archived", next);
      setSelectedItems(new Set());
    } else if (action === "unarchive") {
      const next = new Set(archivedItems);
      targetItems.forEach((id) => next.delete(id));
      setArchivedItems(next);
      saveState("archived", next);
      setSelectedItems(new Set());
    } else if (action === "read") {
      const next = new Set(readItems);
      targetItems.forEach((id) => next.add(id));
      setReadItems(next);
      saveState("read", next);
    } else if (action === "unread") {
      const next = new Set(readItems);
      targetItems.forEach((id) => next.delete(id));
      setReadItems(next);
      saveState("read", next);
    } else if (action === "star") {
      const next = new Set(starredItems);
      targetItems.forEach((id) => {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      });
      setStarredItems(next);
      saveState("starred", next);
    } else if (action === "delete") {
      const next = new Set(deletedItems);
      targetItems.forEach((id) => next.add(id));
      setDeletedItems(next);
      saveState("deleted", next);
      setSelectedItems(new Set());

      const arc = new Set(archivedItems);
      targetItems.forEach((id) => arc.delete(id));
      setArchivedItems(arc);
      saveState("archived", arc);
    }
  };

  const handleRowAction = (e: React.MouseEvent, id: string, action: string) => {
    e.stopPropagation();

    if (action === "archive") {
      const next = new Set(archivedItems);
      next.add(id);
      setArchivedItems(next);
      saveState("archived", next);
    } else if (action === "unarchive") {
      const next = new Set(archivedItems);
      next.delete(id);
      setArchivedItems(next);
      saveState("archived", next);
    } else if (action === "read") {
      const next = new Set(readItems);
      next.add(id);
      setReadItems(next);
      saveState("read", next);
    } else if (action === "unread") {
      const next = new Set(readItems);
      next.delete(id);
      setReadItems(next);
      saveState("read", next);
    } else if (action === "star") {
      const next = new Set(starredItems);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setStarredItems(next);
      saveState("starred", next);
    } else if (action === "delete") {
      const next = new Set(deletedItems);
      next.add(id);
      setDeletedItems(next);
      saveState("deleted", next);

      const arc = new Set(archivedItems);
      arc.delete(id);
      setArchivedItems(arc);
      saveState("archived", arc);
    }
  };

  const handleToggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(starredItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStarredItems(next);
    saveState("starred", next);
  };

  const handleRowClick = (id: string, programId: string, type?: string) => {
    const next = new Set(readItems);
    next.add(id);
    setReadItems(next);
    saveState("read", next);

    if (type === "invitation") return;
    router.push(`/dashboard?id=${programId}`);
  };

  const handleAcceptInvitation = async (e: React.MouseEvent, item: ActivityItem) => {
    e.stopPropagation();
    if (item.type !== "invitation" || !userId) return;

    try {
      const metadata = item.metadata;
      if (!metadata?.program_id) {
        toast.error("Invitation is missing program details.");
        return;
      }

      const { program_id, role } = metadata;

      const { error: reviewerError } = await supabase.from("program_reviewers").insert({
        program_id,
        user_id: userId,
        role: role || "reviewer",
      });

      if (reviewerError) throw reviewerError;

      const notifId = item.id.replace("notif_", "");
      const { error: notifError } = await supabase
        .from("notifications")
        .update({ status: "accepted" })
        .eq("id", notifId);

      if (notifError) throw notifError;

      setActivities((prev) => prev.filter((a) => a.id !== item.id));

      toast.success(`Invitation accepted! You are now a reviewer for ${item.program_name}.`);
      router.push(`/dashboard?id=${program_id}`);
    } catch (err) {
      console.error("Error accepting invitation:", err);
      toast.error("Failed to accept invitation.");
    }
  };

  const handleDeclineInvitation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const notifId = id.replace("notif_", "");
      const { error } = await supabase
        .from("notifications")
        .update({ status: "ignored" })
        .eq("id", notifId);

      if (error) throw error;

      setActivities((prev) => prev.filter((a) => a.id !== id));
      toast.info("Invitation declined.");
    } catch (err) {
      console.error("Error declining invitation:", err);
      toast.error("Failed to decline invitation.");
    }
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.03,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
  };

  if (loading) {
    return (
      <div className="flex h-full flex-1 flex-col overflow-hidden bg-white">
        <div className="h-14 shrink-0 border-b border-zinc-100 bg-white px-6" />
        <div className="border-b border-zinc-100 px-6 py-3">
          <div className="flex gap-2">
            {FILTER_TABS.map((tab) => (
              <Skeleton key={tab} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-5 overflow-hidden px-6 py-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[70%] rounded-full" />
                <Skeleton className="h-3 w-[40%] rounded-full" />
              </div>
              <Skeleton className="hidden h-6 w-16 rounded-full md:block" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="w-full h-14 border-b border-gray-100 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm/5">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <h2 className="font-semibold text-gray-900 truncate">Inbox</h2>

          {selectedItems.size > 0 && (
            <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full animate-in fade-in zoom-in duration-200">
              {selectedItems.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider>
            <div className="relative flex items-center h-8 w-[200px] bg-gray-50/50 rounded-full border border-gray-100/50 focus-within:bg-white focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-100/50 transition-all duration-200">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
              <Input
                placeholder="Search inbox..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[12px] pl-9 pr-8 placeholder:text-gray-400"
              />
              {searchQuery && (
                <X
                  className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-gray-600 absolute right-2.5 p-0.5 rounded-full hover:bg-gray-200/50"
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-8 p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full"
                  onClick={() => handleAction(filter === "Archived" ? "unarchive" : "archive")}
                >
                  {filter === "Archived" ? (
                    <ArchiveRestore className="w-3.5 h-3.5" />
                  ) : (
                    <Archive className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                {filter === "Archived" ? "Unarchive" : "Archive"}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-8 p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full"
                  onClick={() => handleAction("unread")}
                >
                  <Mail className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">Mark as unread</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-8 p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full"
                  onClick={() => handleAction("read")}
                >
                  <MailOpen className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">Mark as read</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-8 p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full"
                  onClick={() => handleAction("star")}
                >
                  <Star className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">Star</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="sticky top-0 z-20 border-b border-zinc-100 bg-white/95 px-6 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setFilter(tab);
                setSelectedItems(new Set());
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors",
                filter === tab
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-white px-6 py-2">
        <div className="relative flex-1 overflow-y-auto px-1 custom-scrollbar">
          <motion.div
            initial="initial"
            animate="animate"
            variants={containerVariants}
            className="flex w-full flex-col pb-10"
          >
            {visibleActivities.length > 0 && (
              <div className="sticky top-0 z-10 mb-1 flex items-center gap-3 bg-white/90 px-4 py-2 text-zinc-400 backdrop-blur-sm">
                <Checkbox
                  checked={
                    visibleActivities.length > 0 && selectedItems.size === visibleActivities.length
                  }
                  onCheckedChange={() => handleSelectAll(visibleActivities.map((a) => a.id))}
                  className="rounded-[4px] border-zinc-300"
                />
                <span className="text-[10px] font-semibold uppercase tracking-widest">
                  Select all
                </span>
              </div>
            )}

            <AnimatePresence mode="popLayout" initial={false}>
              {groupedActivities.length > 0 ? (
                groupedActivities.map((group) => (
                  <div key={group.label}>
                    <div className="px-4 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                      {group.label}
                    </div>

                    {group.items.map((item) => {
                      const isRead = readItems.has(item.id);
                      const isStarred = starredItems.has(item.id);
                      const isSelected = selectedItems.has(item.id);
                      const senderName = getSenderName(item);
                      const summaryText = getInboxSummaryText(item);
                      const showCheckbox = isSelected || selectedItems.size > 0;

                      return (
                        <motion.div
                          key={item.id}
                          variants={itemVariants}
                          initial="initial"
                          animate="animate"
                          exit={{ opacity: 0, x: 20, height: 0 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => handleRowClick(item.id, item.program_id, item.type)}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 transition-colors",
                            "cursor-pointer overflow-hidden",
                            isSelected && "bg-blue-50/60",
                            !isSelected && !isRead && "bg-zinc-50/80",
                            !isSelected && isRead && "hover:bg-zinc-50/80",
                            item.type === "invitation" && "bg-blue-50/30 hover:bg-blue-50/40"
                          )}
                        >
                          <div
                            className="flex w-5 shrink-0 items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              className={cn(
                                "transition-all duration-150",
                                showCheckbox
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100",
                                !showCheckbox && !isRead && "group-hover:hidden"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleSelect(item.id)}
                                className="rounded-[4px] border-zinc-300 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                              />
                            </div>
                            <span
                              className={cn(
                                "absolute h-1.5 w-1.5 rounded-full bg-blue-500 transition-opacity",
                                isRead || showCheckbox ? "opacity-0" : "opacity-100 group-hover:opacity-0"
                              )}
                            />
                          </div>

                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase",
                              getAvatarClass(item)
                            )}
                          >
                            {getInitials(senderName)}
                          </div>

                          <div className="hidden w-40 shrink-0 truncate text-[13px] sm:block">
                            <span
                              className={cn(
                                "truncate",
                                isRead ? "font-medium text-zinc-600" : "font-semibold text-zinc-900"
                              )}
                            >
                              {senderName}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 text-[13px]">
                            <div className="truncate">
                              <span className="sm:hidden font-semibold text-zinc-900 mr-1.5">
                                {senderName}
                              </span>
                              <span className={cn(isRead ? "text-zinc-500" : "text-zinc-700")}>
                                {summaryText}
                              </span>
                            </div>
                            {item.type === "invitation" && (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 rounded-lg bg-blue-600 px-3 text-[11px] font-semibold text-white hover:bg-blue-700"
                                  onClick={(e) => handleAcceptInvitation(e, item)}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-lg border-zinc-200 px-3 text-[11px] font-semibold text-zinc-600"
                                  onClick={(e) => handleDeclineInvitation(e, item.id)}
                                >
                                  Decline
                                </Button>
                              </div>
                            )}
                          </div>

                          {item.type === "application" && item.status && (
                            <div
                              className={cn(
                                "hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider md:block",
                                getStatusPillClass(item.status)
                              )}
                            >
                              {item.status}
                            </div>
                          )}

                          <button
                            type="button"
                            aria-label={isStarred ? "Unstar item" : "Star item"}
                            onClick={(e) => handleToggleStar(e, item.id)}
                            className={cn(
                              "shrink-0 rounded-full p-1 transition-all",
                              isStarred
                                ? "text-amber-500"
                                : "text-zinc-300 opacity-0 group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-500"
                            )}
                          >
                            <Star
                              className={cn(
                                "h-4 w-4",
                                isStarred && "fill-amber-400 text-amber-500"
                              )}
                            />
                          </button>

                          <div className="relative flex w-20 shrink-0 justify-end text-right sm:w-24">
                            <span
                              className={cn(
                                "text-[12px] font-medium transition-opacity duration-200 group-hover:opacity-0",
                                isRead ? "text-zinc-300" : "text-zinc-500"
                              )}
                            >
                              {format(new Date(item.created_at), "MMM d")}
                            </span>

                            <div className="pointer-events-none absolute inset-0 flex items-center justify-end gap-0.5 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full text-zinc-400 hover:bg-blue-50 hover:text-blue-600"
                                      onClick={(e) =>
                                        handleRowAction(e, item.id, isRead ? "unread" : "read")
                                      }
                                    >
                                      {isRead ? (
                                        <Mail className="h-3.5 w-3.5" />
                                      ) : (
                                        <MailOpen className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[10px]">
                                    {isRead ? "Unread" : "Read"}
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                                      onClick={(e) =>
                                        handleRowAction(
                                          e,
                                          item.id,
                                          archivedItems.has(item.id) ? "unarchive" : "archive"
                                        )
                                      }
                                    >
                                      {archivedItems.has(item.id) ? (
                                        <ArchiveRestore className="h-3.5 w-3.5" />
                                      ) : (
                                        <Archive className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[10px]">
                                    {archivedItems.has(item.id) ? "Unarchive" : "Archive"}
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 rounded-full text-zinc-400 hover:bg-red-50 hover:text-red-600"
                                      onClick={(e) => handleRowAction(e, item.id, "delete")}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-[10px]">
                                    Delete
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 py-24 text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50">
                    <Inbox className="h-9 w-9 text-zinc-300" />
                  </div>
                  <p className="text-base font-medium text-zinc-700">Nothing in inbox</p>
                  <p className="mt-2 max-w-sm text-sm text-zinc-400">
                    No messages match the current filters or search. Try a different view.
                  </p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
