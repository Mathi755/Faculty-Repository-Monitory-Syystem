import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  GraduationCap, 
  BarChart3, 
  FileText, 
  Users, 
  LogOut,
  TrendingUp,
  Award,
  Briefcase,
  Download,
  Shield,
  UserCheck,
  Lightbulb,
  BookOpen,
  Clock,
  Calendar,
  Presentation,
  Menu,
  X
} from "lucide-react";
import FacultyDataView from "@/components/hod/FacultyDataView";
import ReportsGeneration from "@/components/hod/ReportsGeneration";
import AwardsDashboard from "@/components/hod/AwardsDashboard";
import PatentsDashboard from "@/components/hod/PatentsDashboard";
import PublicationsDashboard from "@/components/hod/PublicationsDashboard";
import WorkshopsDashboard from "@/components/hod/WorkshopsDashboard";
import MembershipDashboard from "@/components/hod/MembershipDashboard";
import TimetableDashboard from "@/components/hod/TimetableDashboard";
import StudentsDashboard from "@/components/hod/StudentsDashboard";
import MaterialsDashboard from "@/components/hod/MaterialsDashboard";
import { motion, AnimatePresence } from "framer-motion";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

interface HODDashboardProps {
  onLogout: () => void;
}

const HODDashboard = ({ onLogout }: HODDashboardProps) => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [facultyCount, setFacultyCount] = useState<number>(0);
  const [publicationsThisYear, setPublicationsThisYear] = useState<number>(0);
  const [activeProjects, setActiveProjects] = useState<number>(0);
  const [totalFunding, setTotalFunding] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<{ full_name: string; department: string } | null>(null);
  const [recentActivities, setRecentActivities] = useState<
    { type: string; id: string; user_id: string; created_at: string; title: string; faculty: string }[]
  >([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const stats = [
    {
      title: "Total Faculties",
      value: facultyCount.toString(),
      change: "+2",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Publications This Year",
      value: publicationsThisYear.toString(),
      change: "+28%",
      icon: FileText,
      color: "text-green-600"
    },
    {
      title: "Active Projects",
      value: activeProjects.toString(),
      change: "+12",
      icon: Briefcase,
      color: "text-purple-600"
    },
    {
      title: "Total Funding",
      value: `₹${totalFunding.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      change: "+15%",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  const tabItems = [
    { value: "dashboard", label: "Overview", icon: BarChart3 },
    { value: "fdp", label: "FDP", icon: Award },
    { value: "publications", label: "Publications", icon: FileText },
    { value: "projects", label: "Projects", icon: Briefcase },
    { value: "patents", label: "Patents", icon: Lightbulb },
    { value: "workshops", label: "Workshops", icon: Presentation },
    { value: "awards", label: "Awards", icon: Award },
    { value: "timetable", label: "Timetable", icon: Clock },
    { value: "membership", label: "Membership", icon: UserCheck },
    { value: "students", label: "Students", icon: Users },
    { value: "materials", label: "Materials", icon: BookOpen }
  ];

  // Helper function to get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "Publication": return FileText;
      case "FDP": return Award;
      case "Project": return Briefcase;
      case "Award": return Award;
      case "Patent": return Lightbulb;
      case "Membership": return UserCheck;
      case "Student Project": return BookOpen;
      case "Teaching Material": return FileText;
      case "Timetable": return Clock;
      case "Workshop": return Presentation;
      default: return FileText;
    }
  };

  // Helper function to get activity color
  const getActivityColor = (type: string) => {
    switch (type) {
      case "Publication": return "bg-blue-100 text-blue-600";
      case "FDP": return "bg-green-100 text-green-600";
      case "Project": return "bg-purple-100 text-purple-600";
      case "Award": return "bg-yellow-100 text-yellow-600";
      case "Patent": return "bg-orange-100 text-orange-600";
      case "Membership": return "bg-indigo-100 text-indigo-600";
      case "Student Project": return "bg-pink-100 text-pink-600";
      case "Teaching Material": return "bg-teal-100 text-teal-600";
      case "Timetable": return "bg-gray-100 text-gray-600";
      case "Workshop": return "bg-red-100 text-red-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      // Fetch current user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, department")
          .eq("id", user.id)
          .single();
        if (profile) {
          setCurrentUser(profile);
        }
      }
      // 1. Total Faculty
      const { count: faculty } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      setFacultyCount(faculty || 0);

      // 2. Publications This Year
      const currentYear = new Date().getFullYear();
      const { count: pubs } = await supabase
        .from("publications")
        .select("id", { count: "exact", head: true })
        .gte("created_at", `${currentYear}-01-01`)
        .lte("created_at", `${currentYear}-12-31`);
      setPublicationsThisYear(pubs || 0);

      // 3. Active Projects
      const today = new Date().toISOString().split("T")[0];
      const { count: projects } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .lte("duration_from", today)
        .gte("duration_to", today);
      setActiveProjects(projects || 0);

      // 4. Total Funding (sum of funded_amount)
      const { data: fundingRows, error: fundingError } = await supabase
        .from("projects")
        .select("funded_amount");
      if (fundingRows && Array.isArray(fundingRows)) {
        const sum = fundingRows.reduce(
          (acc, row) => acc + (parseFloat(String(row.funded_amount)) || 0),
          0
        );
        setTotalFunding(sum);
      } else {
        setTotalFunding(0);
      }

      // Fetch recent activities from all tables
      const [
        fdpRes, pubRes, projRes, awardsRes, patentsRes, 
        membershipsRes, studentProjRes, teachingRes, 
        timetableRes, workshopsRes
      ] = await Promise.all([
        supabase
          .from("fdp_certifications")
          .select("id, user_id, created_at, title")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("publications")
          .select("id, user_id, created_at, paper_title")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("projects")
          .select("id, user_id, created_at, title")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("awards")
          .select("id, user_id, created_at, title")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("patents")
          .select("id, user_id, created_at, title")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("memberships")
          .select("id, user_id, created_at, professional_body_name")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("student_projects")
          .select("id, user_id, created_at, project_title")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("teaching_materials")
          .select("id, user_id, created_at, title")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("timetables")
          .select("id, user_id, created_at, course")
          .order("created_at", { ascending: false })
          .limit(2),
        supabase
          .from("workshops")
          .select("id, user_id, created_at, event_name")
          .order("created_at", { ascending: false })
          .limit(2),
      ]);

      // Combine and sort all activities by created_at
      let activities = [];
      
      if (fdpRes.data) {
        activities = activities.concat(
          fdpRes.data.map((item) => ({
            type: "FDP",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.title,
          }))
        );
      }
      
      if (pubRes.data) {
        activities = activities.concat(
          pubRes.data.map((item) => ({
            type: "Publication",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.paper_title,
          }))
        );
      }
      
      if (projRes.data) {
        activities = activities.concat(
          projRes.data.map((item) => ({
            type: "Project",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.title,
          }))
        );
      }

      if (awardsRes.data) {
        activities = activities.concat(
          awardsRes.data.map((item) => ({
            type: "Award",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.title,
          }))
        );
      }

      if (patentsRes.data) {
        activities = activities.concat(
          patentsRes.data.map((item) => ({
            type: "Patent",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.title,
          }))
        );
      }

      if (membershipsRes.data) {
        activities = activities.concat(
          membershipsRes.data.map((item) => ({
            type: "Membership",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.professional_body_name,
          }))
        );
      }

      if (studentProjRes.data) {
        activities = activities.concat(
          studentProjRes.data.map((item) => ({
            type: "Student Project",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.project_title,
          }))
        );
      }

      if (teachingRes.data) {
        activities = activities.concat(
          teachingRes.data.map((item) => ({
            type: "Teaching Material",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.title,
          }))
        );
      }

      if (timetableRes.data) {
        activities = activities.concat(
          timetableRes.data.map((item) => ({
            type: "Timetable",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.course,
          }))
        );
      }

      if (workshopsRes.data) {
        activities = activities.concat(
          workshopsRes.data.map((item) => ({
            type: "Workshop",
            id: item.id,
            user_id: item.user_id,
            created_at: item.created_at,
            title: item.event_name,
          }))
        );
      }

      // Sort by created_at descending and take the top 5
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      activities = activities.slice(0, 5);

      // Fetch faculty names for these activities
      const userIds = [...new Set(activities.map((a) => a.user_id))];
      let facultyNames: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        if (profiles) {
          profiles.forEach((p) => {
            facultyNames[p.id] = p.full_name || "Unknown Faculty";
          });
        }
      }

      setRecentActivities(
        activities.map((a) => ({
          ...a,
          faculty: facultyNames[a.user_id] || "Unknown Faculty",
        }))
      );
    };

    fetchStats();
  }, []);

  const particlesInit = async (main: any) => {
    await loadFull(main);
  };
  const MobileSidebar = () => (
    <AnimatePresence>
      {isMobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-80 bg-white shadow-2xl z-50 lg:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-8 w-8 text-white" />
                  <div>
                    <h2 className="text-lg font-bold text-white">HOD Portal</h2>
                    <p className="text-blue-100 text-sm">Navigation</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="text-white hover:bg-blue-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navigation Items */}
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  {tabItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = activeTab === item.value;
                    
                    return (
                      <button
                        key={item.value}
                        onClick={() => {
                          setActiveTab(item.value);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                          isActive
                            ? "bg-blue-100 text-blue-700 border border-blue-200 shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }`}
                      >
                        <IconComponent className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                        <span className="font-medium">{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* User Info Footer */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{currentUser?.full_name}</p>
                    <p className="text-xs text-gray-500">Dept. of {currentUser?.department}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={onLogout}
                  className="w-full text-sm"
                  size="sm"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Desktop Tab Navigation Component
  const DesktopTabNavigation = () => (
    <div className="hidden lg:block">
      <ScrollArea className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-full min-w-max">
          {tabItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-max"
              >
                <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{item.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </ScrollArea>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Spider web particles background */}
      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          fullScreen: { enable: false },
          background: { color: { value: "#f8fafc" } },
          fpsLimit: 60,
          interactivity: {
            events: {
              onHover: { enable: true, mode: "repulse" },
              resize: true,
            },
            modes: {
              repulse: { distance: 80, duration: 0.4 },
            },
          },
          particles: {
            color: { value: "#60a5fa" },
            links: {
              color: "#60a5fa",
              distance: 120,
              enable: true,
              opacity: 0.25,
              width: 1,
            },
            collisions: { enable: false },
            move: {
              direction: "none",
              enable: true,
              outModes: { default: "bounce" },
              random: false,
              speed: 0.6,
              straight: false,
            },
            number: { density: { enable: true, area: 900 }, value: 60 },
            opacity: { value: 0.5 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 3 } },
          },
          detectRetina: true,
        }}
        style={{
          position: "absolute",
          zIndex: 0,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 bg-white shadow-sm border-b sticky top-0"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-blue-900 tracking-tight truncate">
                  HOD Portal
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs sm:text-sm text-slate-600">
                  <span className="truncate">{currentUser?.full_name || "Loading..."}</span>
                  {currentUser?.department && (
                    <span className="truncate">
                      <span className="hidden sm:inline">- </span>
                      Department of {currentUser.department}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                Head of Department
              </Badge>
              <Button 
                variant="outline" 
                onClick={onLogout} 
                size="sm"
                className="hidden lg:flex items-center space-x-1 sm:space-x-2"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          {/* Desktop Navigation */}
          <DesktopTabNavigation />

          <TabsContent value="dashboard" className="space-y-4 sm:space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center sm:text-left"
            >
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 mb-2">
                Department Overview
              </h2>
              <p className="text-slate-600 text-sm sm:text-base">
                Monitor and analyze faculty performance and departmental metrics
              </p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                      <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 truncate pr-2">
                        {stat.title}
                      </CardTitle>
                      <stat.icon className={`h-4 w-4 flex-shrink-0 ${stat.color}`} />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-lg sm:text-xl lg:text-2xl font-bold truncate">
                        {stat.value}
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        {stat.change} from last year
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {[
                {
                  title: "View Faculty Data",
                  description: "Browse all faculty submissions",
                  icon: Users,
                  color: "blue",
                  tab: "fdp"
                },
                {
                  title: "Generate Reports", 
                  description: "Create detailed analytics reports",
                  icon: FileText,
                  color: "green",
                  tab: "projects"
                },
                {
                  title: "View Analytics",
                  description: "Statistical insights and trends", 
                  icon: BarChart3,
                  color: "purple",
                  tab: "publications"
                }
              ].map((action, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                >
                  <Card 
                    className="hover:shadow-xl transition-all duration-300 cursor-pointer group bg-white rounded-xl sm:rounded-2xl border hover:border-slate-300" 
                    onClick={() => setActiveTab(action.tab)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 bg-${action.color}-100 rounded-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                          <action.icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${action.color}-600`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold leading-tight">
                            {action.title}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-1 line-clamp-2">
                            {action.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Card className="bg-white rounded-xl sm:rounded-2xl shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Recent Faculty Activity</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Latest submissions and updates across all categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 sm:space-y-4">
                    {recentActivities.length === 0 && (
                      <div className="text-slate-500 text-center py-6 sm:py-8 text-sm sm:text-base">
                        No recent activity
                      </div>
                    )}
                    {recentActivities.map((activity, idx) => {
                      const IconComponent = getActivityIcon(activity.type);
                      const colorClass = getActivityColor(activity.type);
                      
                      return (
                        <div key={activity.type + activity.id} className="flex items-start justify-between p-3 sm:p-4 bg-slate-50 rounded-lg gap-3">
                          <div className="flex items-start space-x-3 min-w-0 flex-1">
                            <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                              <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm sm:text-base truncate">
                                {activity.faculty}
                              </p>
                              <p className="text-xs sm:text-sm text-slate-600 line-clamp-2">
                                Added {activity.type.toLowerCase()}: {activity.title}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 flex-shrink-0 mt-1">
                            {new Date(activity.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="fdp">
            <FacultyDataView />
          </TabsContent>
          <TabsContent value="publications">
            <PublicationsDashboard />
          </TabsContent>
          <TabsContent value="projects">
            <ReportsGeneration />
          </TabsContent>
          <TabsContent value="patents">
            <PatentsDashboard />
          </TabsContent>
          <TabsContent value="workshops">
            <WorkshopsDashboard />
          </TabsContent>
          <TabsContent value="awards">
            <AwardsDashboard />
          </TabsContent>
          <TabsContent value="timetable">
            <TimetableDashboard />
          </TabsContent>
          <TabsContent value="membership">
            <MembershipDashboard />
          </TabsContent>
          <TabsContent value="students">
            <StudentsDashboard />
          </TabsContent>
          <TabsContent value="materials">
            <MaterialsDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default HODDashboard;