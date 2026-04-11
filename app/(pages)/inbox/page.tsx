"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Users, MessageSquare, Inbox, CheckCircle2, Search, Filter, Archive, Check, Star, MailOpen, X, Mail, ArchiveRestore, Trash2, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ActivityItem = {
  id: string;
  type: 'application' | 'comment' | 'invitation';
  created_at: string;
  program_id: string;
  program_name: string;

  // Application specific
  applicant_name?: string;
  status?: string;

  // Comment specific
  commenter_name?: string;
  comment_text?: string;

  // Invitation specific
  metadata?: any;
};

export default function InboxPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Inbox Toolbar State
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
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
        } catch (e) { }

        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('id')
          .eq('owner_id', user.id);

        if (programsError) throw programsError;

        const programIds = (programsData || []).map(p => p.id);

        let allActivities: ActivityItem[] = [];

        if (programIds.length > 0) {
          // Fetch Applications
          const { data: appsData } = await supabase
            .from('applications')
            .select(`
              id, 
              status, 
              applicant_name,
              created_at,
              program_id,
              programs (name)
            `)
            .in('program_id', programIds)
            .order('created_at', { ascending: false })
            .limit(100);

          if (appsData) {
            appsData.forEach((app: any) => {
              const progInfo = app.programs;
              const progName = Array.isArray(progInfo) ? progInfo[0]?.name : progInfo?.name;

              allActivities.push({
                id: `app_${app.id}`,
                type: 'application',
                created_at: app.created_at,
                program_id: app.program_id,
                program_name: progName || 'Unknown Program',
                applicant_name: app.applicant_name,
                status: app.status
              });
            });
          }

          // Fetch Comments
          const appIdsForComments = appsData?.map(a => a.id) || [];
          if (appIdsForComments.length > 0) {
            const { data: commentsData } = await supabase
              .from('comments')
              .select(`
                id,
                text,
                created_at,
                profiles (full_name),
                applications (program_id, programs (name))
              `)
              .in('application_id', appIdsForComments)
              .order('created_at', { ascending: false })
              .limit(100);

            if (commentsData) {
              commentsData.forEach((comment: any) => {
                const progId = comment.applications?.program_id;
                const progName = comment.applications?.programs?.name || 'Unknown Program';
                const userName = comment.profiles?.full_name || 'Someone';

                if (progId) {
                  allActivities.push({
                    id: `comment_${comment.id}`,
                    type: 'comment',
                    created_at: comment.created_at,
                    program_id: progId,
                    program_name: progName,
                    commenter_name: userName,
                    comment_text: comment.text
                  });
                }
              });
            }
          }
        }

        // Fetch Notifications (Invitations)
        const { data: notificationsData } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (notificationsData) {
          notificationsData.forEach((notif: any) => {
            allActivities.push({
              id: `notif_${notif.id}`,
              type: 'invitation',
              created_at: notif.created_at,
              program_id: notif.metadata?.program_id,
              program_name: notif.metadata?.cohort_name || 'Unknown Program',
              commenter_name: notif.metadata?.inviter_email,
              comment_text: notif.message,
              metadata: notif.metadata
            });
          });
        }

        // Sort by dates descending
        allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    return activities.filter(a => {
      // 0. Filter out deleted items
      if (deletedItems.has(a.id)) return false;

      // 1. Filter out archived items unless "Archived" is selected
      if (filter !== 'Archived' && archivedItems.has(a.id)) return false;
      if (filter === 'Archived' && !archivedItems.has(a.id)) return false;

      // 2. Tab Filter
      if (filter === 'Unread' && readItems.has(a.id)) return false;
      if (filter === 'Read' && !readItems.has(a.id)) return false;
      if (filter === 'Starred' && !starredItems.has(a.id)) return false;
      if (filter === 'Applications' && a.type !== 'application') return false;
      if (filter === 'Comments' && a.type !== 'comment') return false;
      if (filter === 'Invitations' && a.type !== 'invitation') return false;

      // 3. Search text
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const searchText = `${a.applicant_name || ''} ${a.commenter_name || ''} ${a.comment_text || ''} ${a.program_name || ''}`.toLowerCase();
        if (!searchText.includes(query)) return false;
      }

      return true;
    });
  }, [activities, archivedItems, readItems, starredItems, filter, searchQuery]);

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
    const targetItems = selectedItems.size > 0 ? Array.from(selectedItems) : visibleActivities.map(a => a.id);
    if (targetItems.length === 0) return;

    if (action === 'archive') {
      const next = new Set(archivedItems);
      targetItems.forEach(id => next.add(id));
      setArchivedItems(next);
      saveState('archived', next);
      setSelectedItems(new Set()); // clear selection
    } else if (action === 'unarchive') {
      const next = new Set(archivedItems);
      targetItems.forEach(id => next.delete(id));
      setArchivedItems(next);
      saveState('archived', next);
      setSelectedItems(new Set()); // clear selection
    } else if (action === 'read') {
      const next = new Set(readItems);
      targetItems.forEach(id => next.add(id));
      setReadItems(next);
      saveState('read', next);
    } else if (action === 'unread') {
      const next = new Set(readItems);
      targetItems.forEach(id => next.delete(id));
      setReadItems(next);
      saveState('read', next);
    } else if (action === 'star') {
      const next = new Set(starredItems);
      targetItems.forEach(id => {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      });
      setStarredItems(next);
      saveState('starred', next);
    } else if (action === 'delete') {
      const next = new Set(deletedItems);
      targetItems.forEach(id => next.add(id));
      setDeletedItems(next);
      saveState('deleted', next);
      setSelectedItems(new Set()); // clear selection

      // Cleanup other sets to be clean
      const arc = new Set(archivedItems);
      targetItems.forEach(id => arc.delete(id));
      setArchivedItems(arc);
      saveState('archived', arc);
    }
  };

  const handleRowAction = (e: React.MouseEvent, id: string, action: string) => {
    e.stopPropagation();

    if (action === 'archive') {
      const next = new Set(archivedItems);
      next.add(id);
      setArchivedItems(next);
      saveState('archived', next);
    } else if (action === 'unarchive') {
      const next = new Set(archivedItems);
      next.delete(id);
      setArchivedItems(next);
      saveState('archived', next);
    } else if (action === 'read') {
      const next = new Set(readItems);
      next.add(id);
      setReadItems(next);
      saveState('read', next);
    } else if (action === 'unread') {
      const next = new Set(readItems);
      next.delete(id);
      setReadItems(next);
      saveState('read', next);
    } else if (action === 'star') {
      const next = new Set(starredItems);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setStarredItems(next);
      saveState('starred', next);
    } else if (action === 'delete') {
      const next = new Set(deletedItems);
      next.add(id);
      setDeletedItems(next);
      saveState('deleted', next);

      const arc = new Set(archivedItems);
      arc.delete(id);
      setArchivedItems(arc);
      saveState('archived', arc);
    }
  };

  const handleToggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const next = new Set(starredItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStarredItems(next);
    saveState('starred', next);
  };

  const handleRowClick = (id: string, programId: string, type?: string) => {
    // Mark as read when clicking to view it
    const next = new Set(readItems);
    next.add(id);
    setReadItems(next);
    saveState('read', next);

    // Notifications (invitations) don't redirect on click normally, they have buttons
    if (type === 'invitation') return;

    router.push(`/dashboard?id=${programId}`);
  };

  const handleAcceptInvitation = async (e: React.MouseEvent, item: ActivityItem) => {
    e.stopPropagation();
    if (item.type !== 'invitation' || !userId) return;

    try {
      const { program_id, role } = item.metadata;

      // 1. Add to program_reviewers
      const { error: reviewerError } = await supabase
        .from('program_reviewers')
        .insert({
          program_id,
          user_id: userId,
          role: role || 'reviewer'
        });

      if (reviewerError) throw reviewerError;

      // 2. Mark notification as accepted
      const notifId = item.id.replace('notif_', '');
      const { error: notifError } = await supabase
        .from('notifications')
        .update({ status: 'accepted' })
        .eq('id', notifId);

      if (notifError) throw notifError;

      // 3. Mark as read and Remove from local activities
      setActivities(prev => prev.filter(a => a.id !== item.id));

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
      const notifId = id.replace('notif_', '');
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'ignored' })
        .eq('id', notifId);

      if (error) throw error;

      setActivities(prev => prev.filter(a => a.id !== id));
      toast.info("Invitation declined.");
    } catch (err) {
      console.error("Error declining invitation:", err);
      toast.error("Failed to decline invitation.");
    }
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.03
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white p-8 pt-10 overflow-hidden">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-12 w-full mx-8" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white overflow-hidden">
      {/* Inbox Header - Matching Dashboard Design */}
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
            {/* Persistent Search - Fixed Width with inset icon */}
            <div className="relative flex items-center h-8 w-[200px] bg-gray-50/50 rounded-full border border-gray-100/50 focus-within:bg-white focus-within:border-blue-200 focus-within:ring-2 focus-within:ring-blue-100/50 transition-all duration-200">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
              <Input
                placeholder="Search inbox..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-full border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-[12px] pl-9 pr-8 placeholder:text-gray-400"
              />
              {searchQuery && (
                <X
                  className="w-3.5 h-3.5 text-gray-400 cursor-pointer hover:text-gray-600 absolute right-2.5 p-0.5 rounded-full hover:bg-gray-200/50"
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>

            {/* Filter */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-8 p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full relative",
                        filter !== 'All' && "text-blue-500 bg-blue-50/50 hover:bg-blue-100/50"
                      )}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      {filter !== 'All' && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">Filter: {filter}</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-44 p-1.5 rounded-xl">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 px-2">Show</div>
                {['All', 'Unread', 'Read', 'Starred', 'Applications', 'Comments', 'Invitations', 'Archived'].map((f, i) => (
                  <div key={f}>
                    {i === 7 && <DropdownMenuSeparator className="my-1" />}
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilter(f);
                        setSelectedItems(new Set());
                      }}
                      className={cn(
                        "text-[12px] flex items-center justify-between py-1.5 px-2 rounded-md",
                        filter === f ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-600"
                      )}
                    >
                      {f}
                      {filter === f && <Check className="w-3.5 h-3.5" />}
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Action Buttons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-8 p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full"
                  onClick={() => handleAction(filter === 'Archived' ? 'unarchive' : 'archive')}
                >
                  {filter === 'Archived' ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">
                {filter === 'Archived' ? 'Unarchive' : 'Archive'}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-8 p-0 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-full"
                  onClick={() => handleAction('unread')}
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
                  onClick={() => handleAction('read')}
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
                  onClick={() => handleAction('star')}
                >
                  <Star className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[11px]">Star</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-white px-6 py-2">

        <div className="flex-1 overflow-y-auto w-full custom-scrollbar relative px-1">
          <motion.div
            initial="initial"
            animate="animate"
            variants={containerVariants}
            className="w-full flex-col flex pb-10"
          >
            {visibleActivities.length > 0 && (
              <div className="flex items-center px-4 py-2 border-b border-zinc-100/80 mb-1 sticky top-0 bg-white/95 backdrop-blur-sm z-10 w-full rounded-sm">
                <Checkbox
                  checked={visibleActivities.length > 0 && selectedItems.size === visibleActivities.length}
                  onCheckedChange={() => handleSelectAll(visibleActivities.map(a => a.id))}
                  className="rounded-[4px] border-zinc-300"
                />
                {selectedItems.size > 0 ? (
                  <span className="text-[11px] font-medium text-blue-700 ml-4 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    {selectedItems.size} selected
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest ml-4">
                    Select All
                  </span>
                )}
              </div>
            )}

            <AnimatePresence mode="popLayout" initial={false}>
              {visibleActivities.length > 0 ? (
                visibleActivities.map((item, index) => {
                  const isComment = item.type === 'comment';
                  const isRead = readItems.has(item.id);
                  const isStarred = starredItems.has(item.id);
                  const isSelected = selectedItems.has(item.id);

                  return (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      initial="initial"
                      animate="animate"
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`
                          flex items-center gap-3 px-4 py-2 
                          border-b border-zinc-100 last:border-none 
                          hover:bg-zinc-50/80 cursor-pointer 
                          transition-colors group w-full rounded-sm overflow-hidden
                          ${isSelected ? 'bg-blue-50/30 hover:bg-blue-50/50' : ''}
                          ${index === 0 ? 'mt-1' : ''}
                          ${item.type === 'invitation' ? 'bg-blue-50/20 border-l-4 border-l-blue-400' : ''}
                        `}
                      onClick={() => handleRowClick(item.id, item.program_id, item.type)}
                    >
                      {/* Checkbox */}
                      <div className="shrink-0 flex items-center justify-center pt-0.5" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(item.id)}
                          className="rounded-[4px] border-zinc-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                      </div>

                      {/* Star Component */}
                      <div className="shrink-0 flex items-center">
                        <div
                          className="p-1 cursor-pointer opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                          onClick={(e) => handleToggleStar(e, item.id)}
                        >
                          <Star className={`w-4 h-4 transition-colors ${isStarred ? 'fill-yellow-400 text-yellow-500 opacity-100' : 'text-zinc-300 hover:text-zinc-400'}`} />
                        </div>
                      </div>

                      {/* Icon Indicator */}
                      <div className="shrink-0 w-6 flex items-center justify-center">
                        {item.type === 'comment' ? (
                          <MessageSquare className={`w-4 h-4 transition-colors ${isRead ? 'text-zinc-300' : 'text-indigo-400 group-hover:text-indigo-600'}`} />
                        ) : item.type === 'application' ? (
                          <Users className={`w-4 h-4 transition-colors ${isRead ? 'text-zinc-300' : 'text-emerald-400 group-hover:text-emerald-600'}`} />
                        ) : (
                          <UserPlus className={`w-4 h-4 transition-colors ${isRead ? 'text-zinc-300' : 'text-blue-500 group-hover:text-blue-700'}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 flex items-center min-w-0 pr-2">
                        {item.type === 'comment' ? (
                          <div className={`flex-1 flex items-center gap-1.5 truncate text-[13px] ${isRead ? 'text-zinc-500 font-normal' : 'text-zinc-900 font-medium'}`}>
                            <span className="font-bold whitespace-nowrap">{item.commenter_name}</span>
                            <span className={isRead ? 'text-zinc-400' : 'text-zinc-600'}>commented:</span>
                            <span className={`truncate max-w-lg pr-2 ${isRead ? 'text-zinc-500' : 'text-zinc-700'}`}>"{item.comment_text}"</span>
                            <span className="text-zinc-400 whitespace-nowrap px-1 hidden lg:inline">—</span>
                            <span className="text-zinc-400 truncate hidden lg:inline">{item.program_name}</span>
                          </div>
                        ) : item.type === 'application' ? (
                          <div className={`flex-1 flex items-center gap-1.5 truncate text-[13px] ${isRead ? 'text-zinc-500 font-normal' : 'text-zinc-900 font-medium'}`}>
                            <span className="font-bold whitespace-nowrap">{item.applicant_name || 'Anonymous'}</span>
                            <span className={`truncate mr-2 ${isRead ? 'text-zinc-400' : 'text-zinc-600'}`}>submitted a new application for <span className={`${isRead ? 'text-zinc-400 font-normal' : 'text-zinc-500 font-medium'} inline-block`}>{item.program_name}</span></span>
                            <div className={`text-[9px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm whitespace-nowrap ml-auto shrink-0 hidden md:block ${item.status === 'new' ? (isRead ? 'bg-zinc-100 text-zinc-400' : 'bg-blue-100 text-blue-700') :
                              item.status === 'reviewing' ? (isRead ? 'bg-zinc-100 text-zinc-400' : 'bg-amber-100 text-amber-700') :
                                item.status === 'accepted' ? (isRead ? 'bg-zinc-100 text-zinc-400' : 'bg-emerald-100 text-emerald-700') :
                                  'bg-zinc-100 text-zinc-400'
                              }`}>
                              {item.status}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-between gap-4">
                            <div className={`flex items-center gap-1.5 truncate text-[13px] ${isRead ? 'text-zinc-500 font-normal' : 'text-zinc-900 font-medium'}`}>
                              <span className="font-bold whitespace-nowrap">{item.commenter_name}</span>
                              <span className={isRead ? 'text-zinc-400' : 'text-zinc-600'}>invited you to review <span className="font-bold text-blue-600">{item.program_name}</span></span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-md"
                                onClick={(e) => handleAcceptInvitation(e, item)}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 border-zinc-200 text-zinc-600 font-bold text-[11px] rounded-md"
                                onClick={(e) => handleDeclineInvitation(e, item.id)}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Timestamp & Hover Actions */}
                      <div className="shrink-0 text-right w-24 sm:w-28 flex justify-end relative">
                        {/* Static Timestamp */}
                        <span className={`font-medium text-[12px] group-hover:opacity-0 transition-opacity duration-200 ${isRead ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {format(new Date(item.created_at), 'MMM d, ha').toLowerCase()}
                        </span>

                        {/* Hover Action Bar */}
                        <div className="absolute inset-0 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto pr-1">
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-400 hover:text-blue-600 hover:bg-blue-50/50 rounded-full"
                                  onClick={(e) => handleRowAction(e, item.id, isRead ? 'unread' : 'read')}
                                >
                                  {isRead ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-[10px]">{isRead ? 'Unread' : 'Read'}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-full"
                                  onClick={(e) => handleRowAction(e, item.id, archivedItems.has(item.id) ? 'unarchive' : 'archive')}
                                >
                                  {archivedItems.has(item.id) ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-[10px]">{archivedItems.has(item.id) ? 'Unarchive' : 'Archive'}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-400 hover:text-red-600 hover:bg-red-50/50 rounded-full"
                                  onClick={(e) => handleRowAction(e, item.id, 'delete')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-[10px]">Delete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>

                    </motion.div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-32 text-center text-zinc-400">
                  <div className="w-16 h-16 rounded-full bg-zinc-50 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-zinc-300" />
                  </div>
                  <p className="text-sm font-medium text-zinc-600">No messages found</p>
                  <p className="text-xs text-zinc-400 mt-1">Try adjusting your filters or search query.</p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
