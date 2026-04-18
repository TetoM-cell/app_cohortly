"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Users, Target, Activity, Zap, Clock, ArrowRight, MessageSquare, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsStore } from "@/stores/settingsStore";
import { SpotlightTour } from "@/components/SpotlightTour";
import { getDisplayName } from "@/lib/user-display";

export default function HomePage() {
  const router = useRouter();
  const { openSettings } = useSettingsStore();
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  // KPI States
  const [totalApplications, setTotalApplications] = useState(0);
  const [averageScore, setAverageScore] = useState<string | number>("--");
  const [pendingReviews, setPendingReviews] = useState(0);
  const [activePrograms, setActivePrograms] = useState(0);

  // Recent Activity State
  const [recentApps, setRecentApps] = useState<any[]>([]);
  const [recentComments, setRecentComments] = useState<any[]>([]);

  // Top Tips State
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const TIPS = [
    { id: 1, text: "Run AI Reviews in bulk by selecting multiple applicants in the dashboard for instant feedback.", icon: Zap },
    { id: 2, text: "Press Ctrl + K anywhere to open Universal Search and jump between cohorts instantly.", icon: Target },
    { id: 3, text: "Enable 'Collect Applicant Name' in the Form Builder to personalize your candidate tracking.", icon: Users },
    { id: 4, text: "Hover over any AI Score badge in the dashboard to read Gemini's specific reasoning summary.", icon: Zap },
    { id: 5, text: "Your drafts are saved as you work! Resume any cohort design from the 'Recent Activity' feed.", icon: Clock },
    { id: 6, text: "Keep things organized—bulk archive read notifications to clear your workspace.", icon: MessageSquare },
    { id: 7, text: "Connect Slack in Settings to receive instant notifications the moment a new application arrives.", icon: Target },
    { id: 8, text: "Use @name in applicant comments to mention teammates and discuss specific candidates.", icon: Users },
    { id: 9, text: "Add specific scoring criteria in the Cohort Wizard to get tailored AI reviews for your program.", icon: Activity },
    { id: 10, text: "Use 'Video Pitch' or 'File Upload' fields to collect portfolios and intros from your applicants.", icon: Plus },
    { id: 11, text: "Use the dashboard search to find specific candidates by name or company instantly.", icon: Target },
    { id: 12, text: "Quickly move multiple applicants between 'Shortlist' and 'Interview' using bulk status updates.", icon: Activity },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [TIPS.length]);

  useEffect(() => {
    // Check if we just seeded a demo cohort
    if (typeof window !== 'undefined' && window.location.search.includes('demo_seeded=1')) {
        toast.success('Account created! A demo cohort with fictional applicants has been seeded for you.');
        // Clean up the URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete('demo_seeded');
        window.history.replaceState({}, '', url.toString());
    }

    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserName(getDisplayName(user.user_metadata?.full_name, user.email));

          // 1. Fetch active programs (where status is 'published')
          const { data: programsData, error: programsError } = await supabase
            .from('programs')
            .select('id')
            .eq('owner_id', user.id)
            .eq('status', 'published');

          if (programsError) throw programsError;
          
          const programs = programsData || [];
          setActivePrograms(programs.length);

          if (programs.length > 0) {
            const programIds = programs.map(p => p.id);

            // 2. Fetch applications for these programs
            const { data: appsData, error: appsError } = await supabase
              .from('applications')
              .select(`
                id, 
                status, 
                overall_ai_score,
                applicant_name,
                created_at,
                program_id,
                programs (
                  name
                )
              `)
              .in('program_id', programIds);

            if (appsError) throw appsError;

            const apps = appsData || [];
            
            // Calculate Total Applications
            setTotalApplications(apps.length);

            // Calculate Pending Reviews ('new' or 'reviewing')
            const pending = apps.filter(app => app.status === 'new' || app.status === 'reviewing').length;
            setPendingReviews(pending);

            // Calculate Average Score
            const scoredApps = apps.filter(app => app.overall_ai_score !== null && app.overall_ai_score > 0);
            if (scoredApps.length > 0) {
              const totalScore = scoredApps.reduce((acc, app) => acc + Number(app.overall_ai_score), 0);
              const avg = totalScore / scoredApps.length;
              setAverageScore(Math.round(avg));
            } else {
              setAverageScore("--");
            }

            // Calculate Recent Applications
            const sortedApps = [...apps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setRecentApps(sortedApps.slice(0, 5));

            // Fetch Recent Comments
            const appIds = apps.map(a => a.id);
            if (appIds.length > 0) {
              const { data: commentsData } = await supabase
                .from('comments')
                .select(`
                  id,
                  text,
                  created_at,
                  profiles (
                    full_name,
                    email,
                    avatar_url
                  ),
                  applications (
                    program_id,
                    programs (
                      name
                    )
                  )
                `)
                .in('application_id', appIds)
                .order('created_at', { ascending: false })
                .limit(5);

              setRecentComments(commentsData || []);
            }

          } else {
             // Reset if no active programs
             setTotalApplications(0);
             setPendingReviews(0);
             setAverageScore("--");
             setRecentApps([]);
             setRecentComments([]);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-8 pt-10 h-full overflow-y-auto w-full bg-zinc-50/50">
        <div className="max-w-6xl mx-auto space-y-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 pt-10 h-full overflow-y-auto w-full bg-zinc-50/30">
      <motion.div
        initial="initial"
        animate="animate"
        variants={containerVariants}
        className="max-w-6xl mx-auto font-sans pb-16"
      >

        {/* User Greeting Section */}
        <motion.div variants={fadeInUp} id="home-greeting" className="py-16 flex flex-col items-center justify-center text-center mb-6">
          <h3 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            {getGreeting()}, {userName}
          </h3>
        </motion.div>

        {/* Global KPIs */}
        <motion.div variants={fadeInUp} id="home-stats" className="flex flex-wrap items-center justify-between gap-6 mb-12 w-full border-y border-zinc-200/60 py-6">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <div className="flex items-center gap-2 text-zinc-500">
              <Users className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Total Applications</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-zinc-900">{totalApplications}</span>
              <span className="text-xs text-zinc-400">All cohorts</span>
            </div>
          </div>

          <div className="w-px h-12 bg-zinc-200/60 hidden lg:block"></div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <div className="flex items-center gap-2 text-zinc-500">
              <Target className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Average Score</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-zinc-900">{averageScore}</span>
              <span className="text-xs text-zinc-400">System wide</span>
            </div>
          </div>

          <div className="w-px h-12 bg-zinc-200/60 hidden lg:block"></div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <div className="flex items-center gap-2 text-zinc-500">
              <Activity className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Reviews</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-zinc-900">{pendingReviews}</span>
              <span className="text-xs text-zinc-400">Needs attention</span>
            </div>
          </div>

          <div className="w-px h-12 bg-zinc-200/60 hidden lg:block"></div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px]">
            <div className="flex items-center gap-2 text-zinc-500">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Active Programs</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-zinc-900">{activePrograms}</span>
              <span className="text-xs text-zinc-400">Accepting apps</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Sidebar / Top Tips Feed */}
          <motion.div variants={fadeInUp} className="col-span-1 flex flex-col gap-6 order-2 lg:order-1">
            {/* Dynamic Top Tips Card */}
            <Card className="border border-amber-100 bg-gradient-to-b from-amber-50/50 to-white shadow-sm overflow-hidden min-h-[160px]">
              <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-amber-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-100 text-amber-700 p-1 rounded-md">
                      <Lightbulb className="w-4 h-4" />
                    </span>
                    Top Tips
                  </div>
                  <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                    {currentTipIndex + 1} / {TIPS.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-2 min-h-[96px] relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTipIndex}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ 
                      duration: 0.4,
                      ease: "easeInOut"
                    }}
                    className="flex gap-3"
                  >
                    {(() => {
                      const Icon = TIPS[currentTipIndex].icon;
                      return <Icon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />;
                    })()}
                    <p className="text-sm text-zinc-700 leading-relaxed font-medium">
                      {TIPS[currentTipIndex].text}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </CardContent>
              <div className="px-6 pb-4 pt-1">
                 <div className="flex gap-1.5 opacity-60">
                   {TIPS.map((_, i) => (
                     <div 
                       key={i} 
                       className={`h-0.5 rounded-full transition-all duration-500 ${
                         i === currentTipIndex ? "w-4 bg-amber-400 opacity-100" : "w-1 bg-amber-200"
                       }`}
                     />
                   ))}
                 </div>
              </div>
            </Card>

            {/* Quick Actions Grid */}
            <div>
              <h3 className="text-sm flex items-center justify-between font-semibold text-zinc-900 mb-3 px-1 mt-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" className="justify-start h-auto py-3 px-4 text-zinc-700 bg-white/60 hover:bg-zinc-100/80 border-zinc-200 font-medium group transition-all" onClick={() => router.push('/cohorts/new')}>
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </div>
                  Draft a Program
                  <ArrowRight className="w-4 h-4 ml-auto text-zinc-300 group-hover:text-zinc-500" />
                </Button>

                <Button variant="outline" className="justify-start h-auto py-3 px-4 text-zinc-700 bg-white/60 hover:bg-zinc-100/80 border-zinc-200 font-medium group transition-all" onClick={() => openSettings('profile')}>
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mr-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Target className="w-4 h-4" />
                  </div>
                  Configure Account
                  <ArrowRight className="w-4 h-4 ml-auto text-zinc-300 group-hover:text-zinc-500" />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Main Action Area */}
          <motion.div variants={fadeInUp} id="home-cta-card" className="col-span-1 lg:col-span-2 flex flex-col gap-8 order-1 lg:order-2">
            <Card className="border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white/80 backdrop-blur-xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Target className="w-48 h-48 text-blue-600" />
              </div>
              <CardHeader className="relative z-10 pb-4">
                <CardTitle className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                  Ready to launch your first program?
                </CardTitle>
                <CardDescription className="text-zinc-600 text-base max-w-[80%]">
                  Create a cohort to define your application forms, set up your scoring rubrics, and start accepting candidates immediately.
                </CardDescription>
              </CardHeader>
              <CardFooter className="relative z-10 pt-4">
                <Button
                  onClick={() => router.push('/cohorts/new')}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 px-6 py-6 rounded-xl font-semibold gap-2 transition-all duration-300 hover:scale-[1.02]"
                >
                  <Plus className="w-5 h-5" />
                  Start New Cohort
                </Button>
              </CardFooter>
            </Card>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-400" />
                Recent Activity
              </h3>
              
              <div className="flex flex-col gap-6">
                {/* Recent Applications Section */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 px-1">Recent Applications</h4>
                  {recentApps.length > 0 ? (
                    recentApps.map((app) => (
                      <div 
                        key={app.id} 
                        className="rounded-xl border border-zinc-200 p-4 bg-white/60 hover:bg-white/80 transition-all flex items-start gap-4 cursor-pointer hover:shadow-sm" 
                        onClick={() => router.push(`/dashboard?id=${app.program_id}`)}
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-900 font-medium truncate">
                            <span className="font-semibold">{app.applicant_name || 'Anonymous'}</span> applied to <span className="font-semibold">{app.programs?.name || 'a program'}</span>
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center">
                          <div className={`text-xs px-2 py-1 rounded-md font-medium capitalize ${
                            app.status === 'new' ? 'bg-blue-100 text-blue-700' :
                            app.status === 'reviewing' ? 'bg-amber-100 text-amber-700' :
                            app.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-zinc-100 text-zinc-700'
                          }`}>
                            {app.status}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-zinc-200 border-dashed p-6 text-center bg-white/40">
                      <p className="text-zinc-500 text-sm">No new applications yet.</p>
                    </div>
                  )}
                </div>

                {/* Recent Comments Section */}
                <div className="flex flex-col gap-3">
                  <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 px-1">Recent Comments</h4>
                  {recentComments.length > 0 ? (
                    recentComments.map((comment) => {
                      const programId = comment.applications?.program_id;
                      const programName = comment.applications?.programs?.name || 'a program';
                      const userName = getDisplayName(comment.profiles?.full_name, comment.profiles?.email);
                      return (
                        <div 
                          key={comment.id}
                          className="rounded-xl border border-zinc-200 p-4 bg-white/60 hover:bg-white/80 transition-all flex items-start gap-4 cursor-pointer hover:shadow-sm"
                          onClick={() => programId ? router.push(`/dashboard?id=${programId}`) : null}
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                            <MessageSquare className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-900 font-medium truncate flex-wrap">
                              <span className="font-semibold">{userName}</span> commented on an application in <span className="font-semibold">{programName}</span>
                            </p>
                            <p className="text-sm text-zinc-600 truncate italic mt-1 pb-1">"{comment.text}"</p>
                            <p className="text-xs text-zinc-500">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-xl border border-zinc-200 border-dashed p-6 text-center bg-white/40">
                      <p className="text-zinc-500 text-sm">No comments yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>
      <SpotlightTour />
    </div>
  );
}
