import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Presentation
} from "lucide-react";
import FacultyDataView from "@/components/hod/FacultyDataView";
import ReportsGeneration from "@/components/hod/ReportsGeneration";
import AwardsDashboard from "@/components/hod/AwardsDashboard";
import PatentsDashboard from   "@/components/hod/PatentsDashboard";
import PublicationsDashboard from "@/components/hod/PublicationsDashboard";
import WorkshopsDashboard from "@/components/hod/WorkshopsDashboard";
import MembershipDashboard from "@/components/hod/MembershipDashboard";
import TimetableDashboard from "@/components/hod/TimetableDashboard";
import StudentsDashboard from "@/components/hod/StudentsDashboard";
import MaterialsDashboard from "@/components/hod/MaterialsDashboard";
import { motion } from "framer-motion";
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

      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 bg-white shadow-sm border-b"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-blue-900 tracking-tight">
                  HOD Portal
                </h1>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <span>{currentUser?.full_name || "Loading..."}</span>
                  {currentUser?.department && (
                    <span>- Department of {currentUser.department}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Head of Department</Badge>
              <Button variant="outline" onClick={onLogout} className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-6 lg:grid-cols-11 w-full bg-white rounded-xl shadow">
            <TabsTrigger value="dashboard">Overview</TabsTrigger>
            <TabsTrigger value="fdp">FDP</TabsTrigger>
            <TabsTrigger value="publications">Publications</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="patents">Patents</TabsTrigger>
            <TabsTrigger value="workshops">Workshops</TabsTrigger>
            <TabsTrigger value="awards">Awards</TabsTrigger>
            <TabsTrigger value="timetable">Timetable</TabsTrigger>
            <TabsTrigger value="membership">Membership</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="materials">Materials</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2">
                Department Overview
              </h2>
              <p className="text-slate-600">Monitor and analyze faculty performance and departmental metrics</p>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="bg-white rounded-2xl shadow-xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-slate-600">
                        {stat.title}
                      </CardTitle>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-green-600 mt-1">
                        {stat.change} from last year
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-2xl transition-shadow cursor-pointer group bg-white rounded-2xl" onClick={() => setActiveTab("faculty-data")}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">View Faculty Data</CardTitle>
                      <CardDescription>Browse all faculty submissions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-2xl transition-shadow cursor-pointer group bg-white rounded-2xl" onClick={() => setActiveTab("reports")}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:scale-110 transition-transform">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Generate Reports</CardTitle>
                      <CardDescription>Create detailed analytics reports</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="hover:shadow-2xl transition-shadow cursor-pointer group bg-white rounded-2xl" onClick={() => setActiveTab("analytics")}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:scale-110 transition-transform">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">View Analytics</CardTitle>
                      <CardDescription>Statistical insights and trends</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white rounded-2xl shadow-xl">
              <CardHeader>
                <CardTitle>Recent Faculty Activity</CardTitle>
                <CardDescription>Latest submissions and updates across all categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.length === 0 && (
                    <div className="text-slate-500 text-center py-8">No recent activity</div>
                  )}
                  {recentActivities.map((activity, idx) => {
                    const IconComponent = getActivityIcon(activity.type);
                    const colorClass = getActivityColor(activity.type);
                    
                    return (
                      <div key={activity.type + activity.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${colorClass}`}>
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{activity.faculty}</p>
                            <p className="text-sm text-slate-600">
                              Added {activity.type.toLowerCase()}: {activity.title}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
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
