import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { Users, Target, Award } from "lucide-react";

interface FacultyProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  department?: string | null;
  designation?: string | null;
}

interface Membership {
  id: string;
  user_id: string;
  professional_body_name: string;
  membership_id: string;
  expiry_date?: string | null;
  certificate_url?: string | null;
  full_name?: string | null;
  created_at: string;
}

const MembershipDashboard = () => {
  const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: facultyData } = await supabase
          .from("profiles")
          .select("id, email, full_name, department, designation");
        const { data: membershipData } = await supabase
          .from("memberships")
          .select("*")
          .order("created_at", { ascending: false });
        setFaculties(facultyData || []);
        setMemberships(membershipData || []);
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

    const filteredMemberships = memberships.filter(mem =>
      filteredFaculties.some(f => f.id === mem.user_id)
    );

    // By Department
    const departments = [...new Set(faculties.map(f => f.department).filter(Boolean))];
    const membershipsByDepartment = departments.map(dept => {
      const deptFaculties = faculties.filter(f => f.department === dept);
      const deptMemberships = memberships.filter(mem =>
        deptFaculties.some(f => f.id === mem.user_id)
      );
      return {
        department: dept || 'Unknown',
        memberships: deptMemberships.length,
        faculty_count: deptFaculties.length,
        avg_memberships: deptFaculties.length > 0 ? (deptMemberships.length / deptFaculties.length).toFixed(1) : 0
      };
    });

    // By Designation
    const designations = [...new Set(faculties.map(f => f.designation).filter(Boolean))];
    const membershipsByDesignation = designations.map(designation => {
      const desigFaculties = faculties.filter(f => f.designation === designation);
      const desigMemberships = memberships.filter(mem =>
        desigFaculties.some(f => f.id === mem.user_id)
      );
      return {
        designation: designation || 'Unknown',
        memberships: desigMemberships.length,
        faculty_count: desigFaculties.length
      };
    });

    // Monthly Trends
    const monthlyTrends = filteredMemberships.reduce((acc, mem) => {
      const month = mem.created_at.substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const trendData = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        monthKey: month,
        memberships: count
      }));

    // By Professional Body
    const bodies = [...new Set(filteredMemberships.map(mem => mem.professional_body_name))];
    const bodyData = bodies.map(body => ({
      body,
      count: filteredMemberships.filter(mem => mem.professional_body_name === body).length
    })).sort((a, b) => b.count - a.count);

    // Top Performers
    const facultyPerformance = filteredFaculties.map(faculty => {
      const facultyMemberships = memberships.filter(mem => mem.user_id === faculty.id);
      const currentYear = new Date().getFullYear();
      const recentMemberships = facultyMemberships.filter(mem =>
        new Date(mem.created_at).getFullYear() >= currentYear - 1
      );
      return {
        ...faculty,
        membership_count: facultyMemberships.length,
        recent_memberships: recentMemberships.length,
        has_certificate: facultyMemberships.filter(mem => mem.certificate_url).length,
        latest_membership: facultyMemberships.length > 0 ?
          facultyMemberships.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : null
      };
    }).sort((a, b) => b.membership_count - a.membership_count);

    // Certificate Stats
    const certificateStats = {
      with_certificate: filteredMemberships.filter(mem => mem.certificate_url).length,
      without_certificate: filteredMemberships.filter(mem => !mem.certificate_url).length,
      total: filteredMemberships.length
    };

    // Yearly Trends
    const yearlyMemberships = filteredMemberships.reduce((acc, mem) => {
      const year = new Date(mem.created_at).getFullYear();
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const yearlyData = Object.entries(yearlyMemberships)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, count]) => ({
        year: parseInt(year),
        memberships: count
      }));

    return {
      departmentData: membershipsByDepartment,
      designationData: membershipsByDesignation,
      trendData,
      bodyData,
      facultyPerformance,
      certificateStats,
      yearlyData,
      totalMemberships: filteredMemberships.length,
      totalFaculty: filteredFaculties.length,
      avgMembershipsPerFaculty: filteredFaculties.length > 0 ? (filteredMemberships.length / filteredFaculties.length).toFixed(1) : '0',
      activeFaculty: filteredFaculties.filter(f =>
        memberships.some(mem => mem.user_id === f.id)
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
        <h1 className="text-3xl font-bold text-gray-800">Faculty Memberships Dashboard</h1>
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
            <CardTitle className="text-sm font-medium">Total Memberships</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMemberships}</div>
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
            <p className="text-xs text-muted-foreground">{analytics.activeFaculty} with memberships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Memberships/Faculty</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgMembershipsPerFaculty}</div>
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
              {analytics.totalMemberships > 0 ?
                ((analytics.certificateStats.with_certificate / analytics.totalMemberships) * 100).toFixed(0) : '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.certificateStats.with_certificate}/{analytics.totalMemberships} with certificates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memberships by Department */}
        {analytics.departmentData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Memberships by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="memberships" fill="#8884d8" name="Memberships" />
                  <Bar dataKey="faculty_count" fill="#82ca9d" name="Faculty Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Memberships by Designation */}
        {analytics.designationData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Memberships by Designation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.designationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ designation, memberships }) => `${designation}: ${memberships}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="memberships"
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
              <CardTitle>Membership Trends (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="memberships" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* By Professional Body */}
        {analytics.bodyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Memberships by Professional Body</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.bodyData.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="body" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Yearly Memberships Trend */}
      {analytics.yearlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yearly Membership Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="memberships" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {analytics.facultyPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Faculty Membership Overview</CardTitle>
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
                    <th className="text-right p-2">Total Memberships</th>
                    <th className="text-right p-2">Recent Memberships</th>
                    <th className="text-right p-2">With Certificates</th>
                    <th className="text-left p-2">Latest Membership</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.facultyPerformance.slice(0, 20).map((faculty, index) => (
                    <tr key={faculty.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold">{index + 1}</td>
                      <td className="p-2 font-medium">{faculty.full_name || faculty.email}</td>
                      <td className="p-2">{faculty.department || 'N/A'}</td>
                      <td className="p-2">{faculty.designation || 'N/A'}</td>
                      <td className="p-2 text-right font-semibold text-blue-600">{faculty.membership_count}</td>
                      <td className="p-2 text-right">{faculty.recent_memberships}</td>
                      <td className="p-2 text-right">{faculty.has_certificate}</td>
                      <td className="p-2 text-sm text-gray-600">
                        {faculty.latest_membership ? new Date(faculty.latest_membership).toLocaleDateString() : 'N/A'}
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
      {analytics.totalMemberships === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Membership Data Available</h3>
            <p className="text-gray-500">Add some memberships to see detailed analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MembershipDashboard;