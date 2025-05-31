import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Calendar, Award, Users, TrendingUp, Trophy, Building, Clock, Target } from 'lucide-react';

interface FacultyProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  department?: string | null;
  designation?: string | null;
}

interface Award {
  id: string;
  user_id: string;
  title: string;
  issuing_body: string;
  date_awarded: string;
  certificate_url?: string | null;
}

const AwardsDashboard = () => {
  const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Fetch all data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch faculty profiles
        const { data: facultyData, error: facultyError } = await supabase
          .from("profiles")
          .select("id, email, full_name, department, designation");
        
        if (facultyError) {
          console.error("Error fetching faculties:", facultyError);
          return;
        }

        // Fetch all awards
        const { data: awardsData, error: awardsError } = await supabase
          .from("awards")
          .select("*")
          .order("date_awarded", { ascending: false });
        
        if (awardsError) {
          console.error("Error fetching awards:", awardsError);
          return;
        }

        setFaculties(facultyData || []);
        setAwards(awardsData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Analytics calculations using actual data
  const getAnalytics = () => {
    if (faculties.length === 0) return null;

    const filteredFaculties = selectedDepartment === 'all' 
      ? faculties 
      : faculties.filter(f => f.department === selectedDepartment);
    
    const filteredAwards = awards.filter(award => 
      filteredFaculties.some(f => f.id === award.user_id)
    );

    // 1. Awards by Department
    const departments = [...new Set(faculties.map(f => f.department).filter(Boolean))];
    const awardsByDepartment = departments.map(dept => {
      const deptFaculties = faculties.filter(f => f.department === dept);
      const deptAwards = awards.filter(award => 
        deptFaculties.some(f => f.id === award.user_id)
      );
      return {
        department: dept || 'Unknown',
        awards: deptAwards.length,
        faculty_count: deptFaculties.length,
        avg_awards: deptFaculties.length > 0 ? (deptAwards.length / deptFaculties.length).toFixed(1) : 0
      };
    });

    // 2. Awards by Designation
    const designations = [...new Set(faculties.map(f => f.designation).filter(Boolean))];
    const awardsByDesignation = designations.map(designation => {
      const desigFaculties = faculties.filter(f => f.designation === designation);
      const desigAwards = awards.filter(award => 
        desigFaculties.some(f => f.id === award.user_id)
      );
      return {
        designation: designation || 'Unknown',
        awards: desigAwards.length,
        faculty_count: desigFaculties.length
      };
    });

    // 3. Monthly Award Trends (last 24 months)
    const monthlyTrends = filteredAwards.reduce((acc, award) => {
      const month = award.date_awarded.substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    const trendData = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24) // Last 24 months
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        monthKey: month,
        awards: count
      }));

    // 4. Issuing Body Analysis
    const issuingBodies = [...new Set(filteredAwards.map(a => a.issuing_body))];
    const bodyData = issuingBodies.map(body => ({
      body,
      count: filteredAwards.filter(a => a.issuing_body === body).length
    })).sort((a, b) => b.count - a.count);

    // 5. Top Performers
    const facultyPerformance = filteredFaculties.map(faculty => {
      const facultyAwards = awards.filter(a => a.user_id === faculty.id);
      const currentYear = new Date().getFullYear();
      const recentAwards = facultyAwards.filter(a => 
        new Date(a.date_awarded).getFullYear() >= currentYear - 1
      );
      
      return {
        ...faculty,
        award_count: facultyAwards.length,
        recent_awards: recentAwards.length,
        has_certificate: facultyAwards.filter(a => a.certificate_url).length,
        latest_award: facultyAwards.length > 0 ? 
          facultyAwards.sort((a, b) => new Date(b.date_awarded).getTime() - new Date(a.date_awarded).getTime())[0].date_awarded : null
      };
    }).sort((a, b) => b.award_count - a.award_count);

    // 6. Certificate Completion Stats
    const certificateStats = {
      with_certificate: filteredAwards.filter(a => a.certificate_url).length,
      without_certificate: filteredAwards.filter(a => !a.certificate_url).length,
      total: filteredAwards.length
    };

    // 7. Award Timeline (yearly)
    const yearlyAwards = filteredAwards.reduce((acc, award) => {
      const year = new Date(award.date_awarded).getFullYear();
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {});

    const yearlyData = Object.entries(yearlyAwards)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, count]) => ({
        year: parseInt(year),
        awards: count
      }));

    return {
      departmentData: awardsByDepartment,
      designationData: awardsByDesignation,
      trendData,
      bodyData,
      facultyPerformance,
      certificateStats,
      yearlyData,
      totalAwards: filteredAwards.length,
      totalFaculty: filteredFaculties.length,
      avgAwardsPerFaculty: filteredFaculties.length > 0 ? (filteredAwards.length / filteredFaculties.length).toFixed(1) : '0',
      activeFaculty: filteredFaculties.filter(f => 
        awards.some(a => a.user_id === f.id)
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
        <h1 className="text-3xl font-bold text-gray-800">Faculty Awards Dashboard</h1>
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
            <CardTitle className="text-sm font-medium">Total Awards</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalAwards}</div>
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
            <p className="text-xs text-muted-foreground">{analytics.activeFaculty} with awards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Awards/Faculty</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgAwardsPerFaculty}</div>
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
              {analytics.totalAwards > 0 ? 
                ((analytics.certificateStats.with_certificate / analytics.totalAwards) * 100).toFixed(0) : '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.certificateStats.with_certificate}/{analytics.totalAwards} with certificates
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Awards by Department */}
        {analytics.departmentData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Awards by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="awards" fill="#8884d8" name="Awards" />
                  <Bar dataKey="faculty_count" fill="#82ca9d" name="Faculty Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Awards by Designation */}
        {analytics.designationData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Awards by Designation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.designationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ designation, awards }) => `${designation}: ${awards}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="awards"
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
              <CardTitle>Award Trends (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="awards" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Issuing Bodies */}
        {analytics.bodyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Awards by Issuing Body</CardTitle>
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

      {/* Yearly Awards Trend */}
      {analytics.yearlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yearly Award Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="awards" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {analytics.facultyPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Faculty Performance Overview</CardTitle>
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
                    <th className="text-right p-2">Total Awards</th>
                    <th className="text-right p-2">Recent Awards</th>
                    <th className="text-right p-2">With Certificates</th>
                    <th className="text-left p-2">Latest Award</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.facultyPerformance.slice(0, 20).map((faculty, index) => (
                    <tr key={faculty.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-bold">{index + 1}</td>
                      <td className="p-2 font-medium">{faculty.full_name || faculty.email}</td>
                      <td className="p-2">{faculty.department || 'N/A'}</td>
                      <td className="p-2">{faculty.designation || 'N/A'}</td>
                      <td className="p-2 text-right font-semibold text-blue-600">{faculty.award_count}</td>
                      <td className="p-2 text-right">{faculty.recent_awards}</td>
                      <td className="p-2 text-right">{faculty.has_certificate}</td>
                      <td className="p-2 text-sm text-gray-600">
                        {faculty.latest_award ? new Date(faculty.latest_award).toLocaleDateString() : 'N/A'}
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
      {analytics.totalAwards === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Awards Data Available</h3>
            <p className="text-gray-500">Add some awards to faculty members to see detailed analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AwardsDashboard;