import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import { 
  GraduationCap, 
  FileText, 
  Briefcase, 
  Award, 
  Calendar, 
  Users, 
  LogOut,
  BookOpen,
  UserCheck,
  User,
  Building2,
  Menu,
  X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import FDPForm from "@/components/forms/FDPForm";
import PublicationForm from "@/components/forms/PublicationForm";
import ProjectForm from "@/components/forms/ProjectForm";
import PatentForm from "@/components/forms/PatentForm";
import WorkshopForm from "@/components/forms/WorkshopForm";
import AwardsForm from "@/components/forms/AwardsForm";
import TimetableForm from "@/components/forms/TimetableForm";
import MembershipForm from "@/components/forms/MembershipForm";
import StudentProjectForm from "@/components/forms/StudentProjectForm";
import TeachingMaterialForm from "@/components/forms/TeachingMaterialForm";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FacultyDashboardProps {
  onLogout: () => void;
}

interface ModuleCounts {
  fdp: number;
  publications: number;
  projects: number;
  patents: number;
  workshops: number;
  awards: number;
  timetable: number;
  membership: number;
  studentProjects: number;
  teachingMaterials: number;
}

interface UserProfile {
  full_name: string | null;
  email: string | null;
  department: string | null;
  designation: string | null;
}

const tabItems = [
  { value: "overview", label: "Overview" },
  { value: "fdp", label: "FDP" },
  { value: "publications", label: "Publications" },
  { value: "projects", label: "Projects" },
  { value: "patents", label: "Patents" },
  { value: "workshops", label: "Workshops" },
  { value: "awards", label: "Awards" },
  { value: "timetable", label: "Timetable" },
  { value: "membership", label: "Membership" },
  { value: "student-projects", label: "Students" },
  { value: "teaching-materials", label: "Materials" },
];

const FacultyDashboard = ({ onLogout }: FacultyDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [counts, setCounts] = useState<ModuleCounts>({
    fdp: 0,
    publications: 0,
    projects: 0,
    patents: 0,
    workshops: 0,
    awards: 0,
    timetable: 0,
    membership: 0,
    studentProjects: 0,
    teachingMaterials: 0
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchCounts();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, email, department, designation')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email
            });
          
          if (!insertError) {
            setUserProfile({
              full_name: user.user_metadata?.full_name || user.email || 'Faculty Member',
              email: user.email,
              department: null,
              designation: null
            });
          }
        }
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      // handle error
    }
  };

  const fetchCounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        fdpData,
        publicationsData,
        projectsData,
        patentsData,
        workshopsData,
        awardsData,
        timetableData,
        membershipData,
        studentProjectsData,
        teachingMaterialsData
      ] = await Promise.all([
        supabase.from('fdp_certifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('publications').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('patents').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('workshops').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('awards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('timetables').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('student_projects').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('teaching_materials').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      ]);

      setCounts({
        fdp: fdpData.count || 0,
        publications: publicationsData.count || 0,
        projects: projectsData.count || 0,
        patents: patentsData.count || 0,
        workshops: workshopsData.count || 0,
        awards: awardsData.count || 0,
        timetable: timetableData.count || 0,
        membership: membershipData.count || 0,
        studentProjects: studentProjectsData.count || 0,
        teachingMaterials: teachingMaterialsData.count || 0
      });
    } catch (error) {
      // handle error
    }
  };

  const modules = [
    {
      id: "fdp",
      title: "FDP Certifications",
      description: "Faculty Development Program certificates",
      icon: GraduationCap,
      color: "bg-blue-500",
      count: counts.fdp
    },
    {
      id: "publications",
      title: "Research Publications",
      description: "Journal and conference papers",
      icon: FileText,
      color: "bg-green-500",
      count: counts.publications
    },
    {
      id: "projects",
      title: "Funded Projects",
      description: "Research projects and consultancy",
      icon: Briefcase,
      color: "bg-purple-500",
      count: counts.projects
    },
    {
      id: "patents",
      title: "Patents & Designs",
      description: "Intellectual property filings",
      icon: Award,
      color: "bg-orange-500",
      count: counts.patents
    },
    {
      id: "workshops",
      title: "Workshops & Conferences",
      description: "Professional development events",
      icon: Calendar,
      color: "bg-indigo-500",
      count: counts.workshops
    },
    {
      id: "awards",
      title: "Awards & Recognition",
      description: "Achievements and honors",
      icon: Award,
      color: "bg-red-500",
      count: counts.awards
    },
    {
      id: "timetable",
      title: "Course Timetable",
      description: "Teaching schedule management",
      icon: Calendar,
      color: "bg-teal-500",
      count: counts.timetable
    },
    {
      id: "membership",
      title: "Professional Memberships",
      description: "Professional body memberships",
      icon: UserCheck,
      color: "bg-pink-500",
      count: counts.membership
    },
    {
      id: "student-projects",
      title: "Student Projects",
      description: "Student supervision and projects",
      icon: Users,
      color: "bg-cyan-500",
      count: counts.studentProjects
    },
    {
      id: "teaching-materials",
      title: "Teaching Materials",
      description: "Educational resources and content",
      icon: BookOpen,
      color: "bg-lime-500",
      count: counts.teachingMaterials
    }
  ];

  const particlesInit = async (main: any) => {
    await loadFull(main);
  };

  // Mobile Sidebar
  const MobileSidebar = () => (
    <AnimatePresence>
      {isMobileSidebarOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-full w-72 bg-white shadow-2xl z-50 lg:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
                <div className="flex items-center space-x-3">
                  <GraduationCap className="h-8 w-8 text-white" />
                  <div>
                    <h2 className="text-lg font-bold text-white">Faculty Portal</h2>
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
                  {tabItems.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        setActiveTab(item.value);
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                        activeTab === item.value
                          ? "bg-blue-100 text-blue-700 border border-blue-200 shadow-sm"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <span className="font-medium">{item.label}</span>
                      {activeTab === item.value && (
                        <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
              {/* User Info Footer */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900">{userProfile?.full_name}</p>
                    <p className="text-xs text-gray-500">{userProfile?.department}</p>
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

  // Desktop Tab Navigation
  const DesktopTabNavigation = () => (
    <div className="hidden lg:block">
      <ScrollArea className="w-full">
        <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-full min-w-max">
          {tabItems.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-max"
            >
              <span>{item.label}</span>
            </TabsTrigger>
          ))}
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
                  Faculty Portal
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 text-xs sm:text-sm text-slate-600">
                  <span className="truncate">{userProfile?.full_name || "Loading..."}</span>
                  {userProfile?.department && (
                    <span className="truncate">
                      <span className="hidden sm:inline">- </span>
                      {userProfile.department}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
                {userProfile?.designation || 'Faculty'}
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

          <TabsContent value="overview" className="space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2">
              Welcome, {userProfile?.full_name}
            </h2>
            <p className="text-slate-600">Manage your academic and research activities</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {modules.map((module, index) => (
                <Card
                  key={module.id}
                  className="hover:shadow-2xl transition-shadow cursor-pointer group bg-white rounded-2xl"
                  onClick={() => setActiveTab(module.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${module.color} transform group-hover:scale-110 transition-transform`}>
                        <module.icon className="h-5 w-5 text-white" />
                      </div>
                      <Badge variant="secondary">{module.count}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg mb-1">{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fdp">
            <FDPForm />
          </TabsContent>
          <TabsContent value="publications">
            <PublicationForm />
          </TabsContent>
          <TabsContent value="projects">
            <ProjectForm />
          </TabsContent>
          <TabsContent value="patents">
            <PatentForm />
          </TabsContent>
          <TabsContent value="workshops">
            <WorkshopForm />
          </TabsContent>
          <TabsContent value="awards">
            <AwardsForm />
          </TabsContent>
          <TabsContent value="timetable">
            <TimetableForm />
          </TabsContent>
          <TabsContent value="membership">
            <MembershipForm />
          </TabsContent>
          <TabsContent value="student-projects">
            <StudentProjectForm />
          </TabsContent>
          <TabsContent value="teaching-materials">
            <TeachingMaterialForm />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FacultyDashboard;