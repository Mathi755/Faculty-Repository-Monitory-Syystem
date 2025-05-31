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
  Building2
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
import { motion } from "framer-motion";

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

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-blue-900 tracking-tight">
                  Faculty Portal
                </h1>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <User className="h-4 w-4" />
                  <span>{userProfile?.full_name}</span>
                  {userProfile?.department && (
                    <>
                      <Building2 className="h-4 w-4" />
                      <span>{userProfile.department}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">{userProfile?.designation || 'Faculty'}</Badge>
              <Button variant="outline" onClick={onLogout} className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-6 lg:grid-cols-11 w-full bg-white rounded-xl shadow">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="fdp">FDP</TabsTrigger>
              <TabsTrigger value="publications">Publications</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="patents">Patents</TabsTrigger>
              <TabsTrigger value="workshops">Workshops</TabsTrigger>
              <TabsTrigger value="awards">Awards</TabsTrigger>
              <TabsTrigger value="timetable">Timetable</TabsTrigger>
              <TabsTrigger value="membership">Membership</TabsTrigger>
              <TabsTrigger value="student-projects">Students</TabsTrigger>
              <TabsTrigger value="teaching-materials">Materials</TabsTrigger>
            </TabsList>

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
    </div>
  );
};

export default FacultyDashboard;