"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "sonner";
import { Camera, Mail, Lock, Loader2, Upload, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export function ProfileSettings() {
    const router = useRouter();
    const { closeSettings } = useSettingsStore();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [avatarUrl, setAvatarUrl] = useState("/avatar-placeholder.png");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [formData, setFormData] = useState({
        fullName: "",
        shortTitle: "",
        bio: "",
        timezone: "America/Los_Angeles",
    });

    // Modal States
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // Change Email State
    const [emailForm, setEmailForm] = useState({
        currentEmail: "",
        newEmail: "",
        confirmEmail: "",
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            
            setUser(user);
            setEmailForm(prev => ({ ...prev, currentEmail: user.email || "" }));

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile && !error) {
                setAvatarUrl(profile?.avatar_url || user?.user_metadata?.avatar_url || "");
                setFormData({
                    fullName: profile.full_name || user?.user_metadata?.full_name || "",
                    shortTitle: profile.preferences?.shortTitle || "",
                    bio: profile.preferences?.bio || "",
                    timezone: profile.preferences?.timezone || "America/Los_Angeles",
                });
            }
            setIsLoading(false);
        };

        fetchProfile();
    }, []);


    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const imageUrl = URL.createObjectURL(file);
        setAvatarUrl(imageUrl);
        toast.info("Image preview updated. Storage not fully configured yet.");
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const updates = {
                full_name: formData.fullName,
                avatar_url: avatarUrl,
                preferences: {
                    shortTitle: formData.shortTitle,
                    bio: formData.bio,
                    timezone: formData.timezone
                },
                updated_at: new Date().toISOString(),
            };

            const { data: currentProfile } = await supabase.from('profiles').select('preferences').eq('id', user.id).single();
            const existingPrefs = currentProfile?.preferences || {};

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.fullName,
                    avatar_url: avatarUrl,
                    preferences: { ...existingPrefs, ...updates.preferences }
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success("Profile changes saved successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to save profile");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangeEmail = async () => {
        if (emailForm.newEmail !== emailForm.confirmEmail) {
            toast.error("Emails do not match");
            return;
        }
        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({ email: emailForm.newEmail });
        setIsLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            setIsEmailModalOpen(false);
            toast.success("Verification email sent to " + emailForm.newEmail);
        }
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        setIsLoading(true);
        const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
        setIsLoading(false);

        if (error) {
            toast.error(error.message);
        } else {
            setIsPasswordModalOpen(false);
            toast.success("Password changed successfully");
            setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        }
    };

    const timezones = [
        { value: "America/Los_Angeles", label: "(GMT-08:00) Pacific Time" },
        { value: "America/New_York", label: "(GMT-05:00) Eastern Time" },
        { value: "Europe/London", label: "(GMT+00:00) London" },
        { value: "Europe/Paris", label: "(GMT+01:00) Paris" },
        { value: "Asia/Tokyo", label: "(GMT+09:00) Tokyo" },
        { value: "Australia/Sydney", label: "(GMT+11:00) Sydney" },
    ];

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900">Your Account</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Manage your personal information and security settings.
                </p>
            </div>

            <Separator />

            {/* Avatar Section */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Profile Picture</h4>
                    <p className="text-xs text-gray-500">
                        This will be displayed on your public profile and team view.
                    </p>
                </div>

                <div className="md:col-span-2">
                    <div className="flex items-start gap-6">
                        <div
                            className="relative group cursor-pointer"
                            onClick={handleAvatarClick}
                        >
                            <Avatar className="w-20 h-20 rounded-full border-2 border-gray-100 shadow-sm transition-all group-hover:border-gray-300">
                                <AvatarImage src={avatarUrl} className="object-cover" />
                                <AvatarFallback className="text-xl font-bold bg-blue-50 text-blue-600 rounded-full">
                                    {formData.fullName ? formData.fullName.substring(0, 2).toUpperCase() : "JD"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-5 h-5 text-white" />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                        <div className="flex flex-col gap-3 py-1">
                            <div>
                                <h5 className="text-sm font-medium text-gray-900">Upload new image</h5>
                                <p className="text-xs text-gray-500 mt-1">
                                    JPG, GIF or PNG. 1MB max.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAvatarClick}
                                    className="h-8 text-xs"
                                >
                                    <Upload className="w-3 h-3 mr-2" />
                                    Upload
                                </Button>
                                {avatarUrl && avatarUrl !== "/avatar-placeholder.png" && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => setAvatarUrl("")}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Personal Details */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Personal Details</h4>
                    <p className="text-xs text-gray-500">
                        Update your identity details.
                    </p>
                </div>

                <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-6 md:col-span-2">
                    <div className="sm:col-span-4">
                        <Label htmlFor="fullName" className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Full Name</Label>
                        <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="mt-1 h-8 text-xs bg-white"
                        />
                    </div>

                    <div className="sm:col-span-4">
                        <Label htmlFor="shortTitle" className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Title / Role</Label>
                        <Input
                            id="shortTitle"
                            value={formData.shortTitle}
                            onChange={(e) => setFormData({ ...formData, shortTitle: e.target.value })}
                            className="mt-1 h-8 text-xs bg-white"
                            placeholder="e.g. Product Manager"
                        />
                    </div>

                    <div className="col-span-full">
                        <Label htmlFor="bio" className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Bio</Label>
                        <Textarea
                            id="bio"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="mt-1 min-h-[80px] text-xs bg-white"
                            placeholder="Tell us a little about yourself..."
                        />
                    </div>

                    <div className="sm:col-span-4">
                        <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Timezone</Label>
                        <div className="mt-1">
                            <Select
                                value={formData.timezone}
                                onValueChange={(val) => setFormData({ ...formData, timezone: val })}
                            >
                                <SelectTrigger className="h-8 text-xs bg-white">
                                    <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                                <SelectContent>
                                    {timezones.map((tz) => (
                                        <SelectItem key={tz.value} value={tz.value}>
                                            {tz.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Login & Security */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-gray-900">Security</h4>
                    <p className="text-xs text-gray-500">
                        Manage your credentials.
                    </p>
                </div>

                <div className="md:col-span-2 space-y-4 max-w-2xl">
                    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white rounded-lg border border-gray-100">
                                <Mail className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Email Address</p>
                                <p className="text-sm font-medium text-gray-900">{emailForm.currentEmail}</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-white" onClick={() => setIsEmailModalOpen(true)}>Change</Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-white rounded-lg border border-gray-100">
                                <Lock className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Password</p>
                                <p className="text-sm font-medium text-gray-900">••••••••••••••••</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 text-xs bg-white" onClick={() => setIsPasswordModalOpen(true)}>Update</Button>
                    </div>
                </div>
            </div>

            {/* Save Action */}
            <div className="flex justify-end pt-4">
                <Button onClick={handleSaveProfile} disabled={isSaving} className="h-9 px-6 font-bold text-xs uppercase tracking-wider">
                    {isSaving && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                    Save changes
                </Button>
            </div>

            {/* Modals */}
            <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Change Email Address</DialogTitle>
                        <DialogDescription>
                            We&quot;ll send a verification link to your new email address.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New Email</Label>
                            <Input
                                type="email"
                                value={emailForm.newEmail}
                                onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                                placeholder="Enter new email address"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm New Email</Label>
                            <Input
                                type="email"
                                value={emailForm.confirmEmail}
                                onChange={(e) => setEmailForm({ ...emailForm, confirmEmail: e.target.value })}
                                placeholder="Re-enter new email address"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEmailModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleChangeEmail} disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Update Email
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Password</DialogTitle>
                        <DialogDescription>
                            Ensure your account is using a long, random password to stay secure.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Confirm New Password</Label>
                            <Input
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleChangePassword} disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Update Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
