"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import {
    MoreHorizontal,
    Search,
    User,
    UserPlus,
    AlertTriangle,
    ChevronDown,
    Loader2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Reviewer {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    programsCount: number;
    roles: string[];
}

export function TeamSettings() {
    const [reviewers, setReviewers] = useState<Reviewer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [myPrograms, setMyPrograms] = useState<{ id: string; name: string }[]>([]);
    
    // Invite Form State
    const [inviteEmail, setInviteEmail] = useState("");
    const [selectedProgram, setSelectedProgram] = useState<string>("");
    const [selectedRole, setSelectedRole] = useState("reviewer");
    const [isInviting, setIsInviting] = useState(false);

    useEffect(() => {
        const fetchTeam = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: programs } = await supabase
                .from('programs')
                .select('id, name')
                .eq('owner_id', user.id);

            setMyPrograms(programs || []);

            const programIds = programs?.map(p => p.id) || [];

            if (programIds.length === 0) {
                setReviewers([]);
                setIsLoading(false);
                return;
            }

            const { data: rawReviewers, error } = await supabase
                .from('program_reviewers')
                .select(`
                    user_id,
                    role,
                    program_id,
                    profiles:user_id ( full_name, email, avatar_url )
                `)
                .in('program_id', programIds);

            if (error) {
                console.error("Error fetching team:", error);
                toast.error("Failed to load team members");
            } else {
                const map = new Map<string, Reviewer>();

                rawReviewers?.forEach((r: any) => {
                    const uid = r.user_id;
                    if (!map.has(uid)) {
                        map.set(uid, {
                            id: uid,
                            name: r.profiles?.full_name || "Unknown",
                            email: r.profiles?.email || "",
                            avatarUrl: r.profiles?.avatar_url,
                            programsCount: 0,
                            roles: []
                        });
                    }
                    const existing = map.get(uid)!;
                    existing.programsCount++;
                    if (!existing.roles.includes(r.role)) {
                        existing.roles.push(r.role);
                    }
                });
                setReviewers(Array.from(map.values()));
            }
            setIsLoading(false);
        };

        fetchTeam();
    }, []);

    const filteredReviewers = reviewers.filter(reviewer =>
        reviewer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reviewer.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getInitials = (name: string, email: string) => {
        if (name) {
            return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
        }
        return email ? email.substring(0, 2).toUpperCase() : "?";
    };
    const handleSendInvite = async () => {
        if (!inviteEmail || !inviteEmail.includes("@")) {
            toast.error("Please enter a valid email address.");
            return;
        }
        if (!selectedProgram) {
            toast.error("Please select a cohort to invite them to.");
            return;
        }

        setIsInviting(true);
        try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            
            // 1. Check if user exists
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', inviteEmail)
                .maybeSingle();

            if (profileError) throw profileError;

            if (!profile) {
                toast.error("User not found. Reviewers must already be signed in to Cohortly.");
                setIsInviting(false);
                return;
            }

            // 2. Check for duplicate invite
            const { data: existingInvite } = await supabase
                .from('notifications')
                .select('id')
                .eq('recipient_id', profile.id)
                .eq('type', 'invitation')
                .eq('status', 'active')
                .contains('metadata', { program_id: selectedProgram })
                .maybeSingle();

            if (existingInvite) {
                toast.error("An invitation for this user is already pending for this cohort.");
                setIsInviting(false);
                return;
            }

            // 3. Send Notification
            const cohortName = myPrograms.find(p => p.id === selectedProgram)?.name || "a cohort";
            const { error: inviteError } = await supabase
                .from('notifications')
                .insert({
                    recipient_id: profile.id,
                    type: 'invitation',
                    title: 'New Reviewer Invitation',
                    message: `You have been invited to review applications for ${cohortName}.`,
                    metadata: {
                        program_id: selectedProgram,
                        role: selectedRole,
                        inviter_email: currentUser?.email,
                        cohort_name: cohortName
                    }
                });

            if (inviteError) throw inviteError;

            toast.success(`Invitation sent to ${inviteEmail}!`);
            setInviteEmail("");
        } catch (err: any) {
            console.error("Error sending invite:", err);
            toast.error(err.message || "Failed to send invitation.");
        } finally {
            setIsInviting(false);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900">Team & Workspace</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    View team members who have access to your cohorts.
                </p>
            </div>

            <Separator />

            {/* Invite New Reviewer */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Invite to Workspace</h4>
                    <p className="text-xs text-gray-500">
                        Add users to your cohorts as reviewers or admins.
                    </p>
                    <p className="text-[10px] font-bold text-amber-600 mt-2 flex items-center gap-1.5 bg-amber-50 w-fit px-2 py-0.5 rounded-full border border-amber-100">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Requires existing Cohortly account.
                    </p>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                                <Input
                                    placeholder="reviewer@email.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Select Cohort</label>
                                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                                    <SelectTrigger size="sm" className="w-full text-xs">
                                        <SelectValue placeholder="Choose a cohort..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {myPrograms.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="space-y-1.5 min-w-[120px]">
                                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                                        <SelectTrigger size="sm" className="h-8 text-[11px] border-none bg-gray-50 hover:bg-gray-100 font-bold uppercase transition-colors">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="admin" className="text-xs">Admin</SelectItem>
                                            <SelectItem value="reviewer" className="text-xs">Reviewer</SelectItem>
                                            <SelectItem value="viewer" className="text-xs">Viewer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button 
                                onClick={handleSendInvite} 
                                disabled={isInviting || !inviteEmail || !selectedProgram}
                                size="sm" 
                                className="h-8 bg-blue-600 hover:bg-blue-700 font-bold text-xs px-6 rounded-lg transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                            >
                                {isInviting ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <UserPlus className="w-3.5 h-3.5 mr-2" />}
                                Send Invitation
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Team Members */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Team Members</h4>
                    <p className="text-xs text-gray-500">
                        A list of everyone with access to your cohorts.
                    </p>
                </div>

                <div className="md:col-span-2 space-y-3">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                            placeholder="Search team members..."
                            className="pl-8 h-8 text-xs bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                        {filteredReviewers.length === 0 && !isLoading ? (
                            <div className="p-8 text-center text-gray-500">
                                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No team members found.</p>
                                <p className="text-xs mt-1">Invite reviewers inside your cohort settings.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-gray-50/50">
                                    <TableRow>
                                        <TableHead className="w-[240px] text-[9px] uppercase font-bold text-gray-400 tracking-wider h-9">Member</TableHead>
                                        <TableHead className="text-[9px] uppercase font-bold text-gray-400 tracking-wider h-9">Access</TableHead>
                                        <TableHead className="text-[9px] uppercase font-bold text-gray-400 tracking-wider h-9">Role(s)</TableHead>
                                        <TableHead className="text-right h-9"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReviewers.map((reviewer) => (
                                        <TableRow key={reviewer.id} className="group hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="py-2">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar className="h-8 w-8 border border-gray-100">
                                                        <AvatarImage src={reviewer.avatarUrl} />
                                                        <AvatarFallback className="bg-gray-100 text-gray-700 text-[9px] font-bold">
                                                            {getInitials(reviewer.name, reviewer.email)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold text-gray-900">
                                                            {reviewer.name}
                                                        </span>
                                                        <span className="text-[10px] text-gray-500">{reviewer.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <Badge variant="outline" className="font-bold text-[10px] text-gray-600 border-gray-200 uppercase tracking-tight">
                                                    {reviewer.programsCount} Cohort{reviewer.programsCount !== 1 ? 's' : ''}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 flex-wrap">
                                                    {reviewer.roles.map(r => (
                                                        <Badge key={r} variant="secondary" className="capitalize text-[10px] font-bold border-none">
                                                            {r}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 cursor-not-allowed">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                        {isLoading && (
                            <div className="p-8 flex justify-center">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}
