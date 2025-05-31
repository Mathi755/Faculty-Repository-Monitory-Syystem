import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Area, AreaChart } from 'recharts';
import { Calendar, Award, Users, TrendingUp, Trophy, Building, Clock, Target } from 'lucide-react';

interface FacultyProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  department?: string | null;
  designation?: string | null;
}

interface FDPCertification {
  id: string;
  user_id: string;
  title: string;
  organizer: string;
  duration_from: string;
  duration_to: string;
  certificate_url?: string | null;
}

const FacultyDataView = () => {
  const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
  const [fdps, setFdps] = useState<FDPCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: facultyData, error: facultyError } = await supabase
          .from("profiles")
          .select("id, email, full_name, department, designation");
        if (facultyError) return;

        const { data: fdpData, error: fdpError } = await supabase
          .from("fdp_certifications")
          .select("*")
          .order("duration_from", { ascending: false });
        if (fdpError) return;

        setFaculties(facultyData || []);
        setFdps(fdpData || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Analytics calculations
  const getAnalytics = () => {
    if (faculties.length === 0) return null;

    const filteredFaculties = selectedDepartment === 'all'
      ? faculties
      : faculties.filter(f => f.department === selectedDepartment);

    const filteredFdps = fdps.filter(fdp =>
      filteredFaculties.some(f => f.id === fdp.user_id)
    );

    // By Department
    const departments = [...new Set(faculties.map(f => f.department).filter(Boolean))];
    const fdpsByDepartment = departments.map(dept => {
      const deptFaculties = faculties.filter(f => f.department === dept);
      const deptFdps = fdps.filter(fdp =>
        deptFaculties.some(f => f.id === fdp.user_id)
      );
      return {
        department: dept || 'Unknown',
        fdps: deptFdps.length,
        faculty_count: deptFaculties.length,
        avg_fdps: deptFaculties.length > 0 ? (deptFdps.length / deptFaculties.length).toFixed(1) : 0
      };
    });

    // By Designation
    const designations = [...new Set(faculties.map(f => f.designation).filter(Boolean))];
    const fdpsByDesignation = designations.map(designation => {
      const desigFaculties = faculties.filter(f => f.designation === designation);
      const desigFdps = fdps.filter(fdp =>
        desigFaculties.some(f => f.id === fdp.user_id)
      );
      return {
        designation: designation || 'Unknown',
        fdps: desigFdps.length,
        faculty_count: desigFaculties.length
      };
    });

    // Monthly Trends (by start date)
    const monthlyTrends = filteredFdps.reduce((acc, fdp) => {
      const month = fdp.duration_from.substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const trendData = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        monthKey: month,
        fdps: count
      }));

    // By Organizer
    const organizers = [...new Set(filteredFdps.map(fdp => fdp.organizer))];
    const organizerData = organizers.map(org => ({
      organizer: org,
      count: filteredFdps.filter(fdp => fdp.organizer === org).length
    })).sort((a, b) => b.count - a.count);

    // Top Performers
    const facultyPerformance = filteredFaculties.map(faculty => {
      const facultyFdps = fdps.filter(fdp => fdp.user_id === faculty.id);
      const currentYear = new Date().getFullYear();
      const recentFdps = facultyFdps.filter(fdp =>
        new Date(fdp.duration_from).getFullYear() >= currentYear - 1
      );
      return {
        ...faculty,
        fdp_count: facultyFdps.length,
        recent_fdps: recentFdps.length,
        has_certificate: facultyFdps.filter(fdp => fdp.certificate_url).length,
        latest_fdp: facultyFdps.length > 0 ?
          facultyFdps.sort((a, b) => new Date(b.duration_from).getTime() - new Date(a.duration_from).getTime())[0].duration_from : null
      };
    }).sort((a, b) => b.fdp_count - a.fdp_count);

    // Certificate Stats
    const certificateStats = {
      with_certificate: filteredFdps.filter(fdp => fdp.certificate_url).length,
      without_certificate: filteredFdps.filter(fdp => !fdp.certificate_url).length,
      total: filteredFdps.length
    };

    // Yearly Trends
    const yearlyFdps = filteredFdps.reduce((acc, fdp) => {
      const year = new Date(fdp.duration_from).getFullYear();
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const yearlyData = Object.entries(yearlyFdps)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, count]) => ({
        year: parseInt(year),
        fdps: count
      }));

    return {
      departmentData: fdpsByDepartment,
      designationData: fdpsByDesignation,
      trendData,
      organizerData,
      facultyPerformance,
      certificateStats,
      yearlyData,
      totalFdps: filteredFdps.length,
      totalFaculty: filteredFaculties.length,
      avgFdpsPerFaculty: filteredFaculties.length > 0 ? (filteredFdps.length / filteredFaculties.length).toFixed(1) : '0',
      activeFaculty: filteredFaculties.filter(f =>
        fdps.some(fdp => fdp.user_id === f.id)
      ).length
    };
  };

  const analytics = getAnalytics();
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347'];
  const departments = [...new Set(faculties.map(f => f.department).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics data...</div>
      </div>
    );
  }

  if (!analytics || faculties.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">No faculty data available. Please add faculty profiles first.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">FDP Certificates Dashboard</h1>
        {departments.length > 0 && (
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total FDPs</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalFdps}</div>
            <p className="text-xs text-muted-foreground">Across all faculties</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalFaculty}</div>
            <p className="text-xs text-muted-foreground">{analytics.activeFaculty} with FDPs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg FDPs/Faculty</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgFdpsPerFaculty}</div>
            <p className="text-xs text-muted-foreground">Performance metric</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificate Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalFdps > 0 ?
                ((analytics.certificateStats.with_certificate / analytics.totalFdps) * 100).toFixed(0) : '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.certificateStats.with_certificate}/{analytics.totalFdps} with certificates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FDPs by Department */}
        {analytics.departmentData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>FDPs by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="fdps" fill="#8884d8" name="FDPs" />
                  <Bar dataKey="faculty_count" fill="#82ca9d" name="Faculty Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* FDPs by Designation */}
        {analytics.designationData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>FDPs by Designation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.designationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ designation, fdps }) => `${designation}: ${fdps}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="fdps"
                  >
                    {analytics.designationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly Trends */}
        {analytics.trendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>FDP Trends (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="fdps" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Organizers */}
        {analytics.organizerData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>FDPs by Organizer</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.organizerData.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="organizer" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Yearly FDP Trend */}
      {analytics.yearlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yearly FDP Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="fdps" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {analytics.facultyPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Faculty FDP Participation Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Rank</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Designation</th>
                    <th className="text-right p-2">Total FDPs</th>
                    <th className="text-right p-2">Recent FDPs</th>
                    <th className="text-right p-2">With Certificates</th>
                    <th className="text-left p-2">Latest FDP</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.facultyPerformance.slice(0, 20).map((faculty, index) => (
                    <tr key={faculty.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold">{index + 1}</td>
                      <td className="p-2 font-medium">{faculty.full_name || faculty.email}</td>
                      <td className="p-2">{faculty.department || 'N/A'}</td>
                      <td className="p-2">{faculty.designation || 'N/A'}</td>
                      <td className="p-2 text-right font-semibold text-blue-600">{faculty.fdp_count}</td>
                      <td className="p-2 text-right">{faculty.recent_fdps}</td>
                      <td className="p-2 text-right">{faculty.has_certificate}</td>
                      <td className="p-2 text-sm text-gray-600">
                        {faculty.latest_fdp ? new Date(faculty.latest_fdp).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data Message */}
      {analytics.totalFdps === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No FDP Data Available</h3>
            <p className="text-gray-500">Add some FDP certificates to faculty members to see detailed analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FacultyDataView;