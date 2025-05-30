import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, GraduationCap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface StudentProject {
  id: string;
  project_title: string;
  project_type: string;
  students_involved: string[];
  semester: string | null;
  department: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

const StudentProjectForm = () => {
  const [formData, setFormData] = useState({
    projectTitle: '',
    projectType: '',
    studentNames: '',
    semester: '',
    department: '',
    description: '',
    status: 'Ongoing'
  });

  const [studentProjects, setStudentProjects] = useState<StudentProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    checkAuthAndFetchProjects();
  }, []);

  const checkAuthAndFetchProjects = async () => {
    try {
      setIsInitializing(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setCurrentUser(null);
        setStudentProjects([]);
        return;
      }

      const user = session?.user;
      if (!user) {
        console.warn('No authenticated user found');
        setCurrentUser(null);
        setStudentProjects([]);
        return;
      }

      console.log('Authenticated user:', user.id);
      setCurrentUser(user);
      await fetchProjects(user.id);
    } catch (error) {
      console.error('Error in checkAuthAndFetchProjects:', error);
      setCurrentUser(null);
      setStudentProjects([]);
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchProjects = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('student_projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching student projects:', error);
        throw error;
      }
      
      setStudentProjects(
        (data || []).map((item: any) => ({
          id: item.id,
          project_title: item.project_title,
          project_type: item.project_type,
          students_involved: item.students_involved,
          semester: item.semester ?? null,
          department: item.department ?? null,
          description: item.description ?? null,
          status: item.status ?? "Ongoing",
          created_at: item.created_at,
        }))
      );
    } catch (error: any) {
      toast({
        title: "Error fetching projects",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!currentUser) {
      toast({
        title: "Authentication Error",
        description: "Please log in to add a student project",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser.id) {
      toast({
        title: "User ID Error",
        description: "Unable to identify user. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.projectTitle || !formData.projectType || !formData.studentNames) {
      toast({
        title: "Validation Error", 
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      console.log('Submitting student project for user:', currentUser.id);

      const studentArray = formData.studentNames
        .split(',')
        .map(name => name.trim())
        .filter(name => name);

      if (studentArray.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please enter at least one student name",
          variant: "destructive",
        });
        return;
      }

      // Prepare insert data with required user_id
      const insertData = {
        user_id: currentUser.id, // This is required by the table schema
        project_title: formData.projectTitle.trim(),
        project_type: formData.projectType,
        students_involved: studentArray,
        semester: formData.semester.trim() || null,
        department: formData.department.trim() || null,
        description: formData.description.trim() || null,
        status: formData.status
      };

      console.log('Insert data:', insertData);

      const { error } = await supabase
        .from('student_projects')
        .insert(insertData);
      
      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      // Reset form
      setFormData({
        projectTitle: '',
        projectType: '',
        studentNames: '',
        semester: '',
        department: '',
        description: '',
        status: 'Ongoing'
      });

      await fetchProjects(currentUser.id);
      
      toast({
        title: "Student Project Added",
        description: "The student project has been saved successfully."
      });
    } catch (error: any) {
      console.error('Error adding student project:', error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Match these to your project types
  const projectTypes = [
    "Major",
    "Minor", 
    "Mini",
    "External",
    "In-house"
  ];

  // Show loading state while initializing
  if (isInitializing) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Loading your student projects...</p>
        </div>
      </div>
    );
  }

  // Show authentication error if no user
  if (!currentUser) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Please log in to manage student projects.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Projects</h2>
        <p className="text-gray-600">Manage student projects under your supervision</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add Student Project</span>
            </CardTitle>
            <CardDescription>
              Enter details of student projects you are supervising
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="projectTitle">Project Title *</Label>
                <Input
                  id="projectTitle"
                  value={formData.projectTitle}
                  onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                  placeholder="Enter project title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="projectType">Project Type *</Label>
                <Select value={formData.projectType} onValueChange={(value) => setFormData({ ...formData, projectType: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="studentNames">Student Names *</Label>
                <Input
                  id="studentNames"
                  value={formData.studentNames}
                  onChange={(e) => setFormData({ ...formData, studentNames: e.target.value })}
                  placeholder="Enter student names (comma separated)"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter multiple student names separated by commas
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                    placeholder="e.g., 6th Semester"
                  />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., Computer Science"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Project Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the project"
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding Project..." : "Add Student Project"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <GraduationCap className="h-5 w-5" />
              <span>Supervised Projects</span>
            </CardTitle>
            <CardDescription>
              Student projects under your supervision
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {studentProjects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900">{project.project_title}</h4>
                    <span className={cn(
                      "px-2 py-1 text-xs rounded-full",
                      project.status === "Completed" ? "bg-green-100 text-green-800" :
                      project.status === "Ongoing" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    )}>
                      {project.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                      {project.project_type}
                    </span>
                    {project.semester && (
                      <>
                        <span className="text-sm font-medium text-gray-900">Semester:</span>
                        <span className="text-sm text-gray-600">{project.semester}</span>
                      </>
                    )}
                  </div>

                  {project.department && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Department:</span> {project.department}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Students:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {project.students_involved.map((student, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {student}
                        </span>
                      ))}
                    </div>
                  </div>

                  {project.description && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Description:</span> {project.description}
                    </div>
                  )}
                </div>
              ))}
              {studentProjects.length === 0 && (
                <p className="text-center text-gray-500 py-8">No student projects added yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentProjectForm;