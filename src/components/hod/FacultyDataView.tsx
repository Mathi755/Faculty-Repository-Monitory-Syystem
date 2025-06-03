import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Target, Award, Search, TrendingUp, Calendar, Building2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const FacultyDataView = () => {
  const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
  const [fdps, setFdps] = useState<FDPCertification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Only DSBS department
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: facultyData } = await supabase
          .from("profiles")
          .select("id, email, full_name, department, designation")
          .eq("department", "DSBS");
        const { data: fdpData } = await supabase
          .from("fdp_certifications")
          .select("*")
          .order("duration_from", { ascending: false });

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

    const filteredFaculties = faculties.filter(f => f.designation !== "HOD");
    const filteredFdps = fdps.filter(fdp =>
      filteredFaculties.some(f => f.id === fdp.user_id)
    );

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
      const facultyFdps = filteredFdps.filter(fdp => fdp.user_id === faculty.id);
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

    // Certificate completion pie data
    const certificatePieData = [
      { name: 'With Certificate', value: certificateStats.with_certificate, color: '#10B981' },
      { name: 'Without Certificate', value: certificateStats.without_certificate, color: '#F59E0B' }
    ].filter(item => item.value > 0);

    return {
      trendData,
      organizerData,
      facultyPerformance,
      certificateStats,
      yearlyData,
      certificatePieData,
      totalFdps: filteredFdps.length,
      totalFaculty: filteredFaculties.length,
      avgFdpsPerFaculty: filteredFaculties.length > 0 ? (filteredFdps.length / filteredFaculties.length).toFixed(1) : '0',
      activeFaculty: filteredFaculties.filter(f =>
        filteredFdps.some(fdp => fdp.user_id === f.id)
      ).length
    };
  };

  const analytics = getAnalytics();

  // Filter faculty based on search term
  const filteredFacultyPerformance = analytics?.facultyPerformance?.filter(faculty =>
    (faculty.full_name || faculty.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="text-xl font-semibold text-gray-700">Loading analytics data...</div>
        </div>
      </div>
    );
  }

  if (!analytics || faculties.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Faculty Data Available</h3>
            <p className="text-gray-500">No faculty profiles found for DSBS department. Please add faculty profiles first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Modal for certificate details
  const Modal = () => {
    if (!selectedFaculty) return null;
    const facultyFdps = fdps.filter(fdp => fdp.user_id === selectedFaculty.id);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedFaculty.full_name || selectedFaculty.email}
              </h2>
              <p className="text-gray-600">{selectedFaculty.designation || 'Faculty'}</p>
            </div>
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => setShowModal(false)}
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-6 max-h-96 overflow-y-auto">
            {facultyFdps.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-500">No FDP certificates found.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {facultyFdps.map((fdp) => (
                  <div key={fdp.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="font-semibold text-gray-800 mb-2">{fdp.title}</div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>Organizer: {fdp.organizer}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(fdp.duration_from).toLocaleDateString()} - {new Date(fdp.duration_to).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {fdp.certificate_url ? (
                      <div className="mt-3 flex gap-2">
                        <a
                          href={fdp.certificate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Certificate
                        </a>
                        <a
                          href={fdp.certificate_url}
                          download
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <span className="inline-block mt-2 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        No certificate file
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">FDP Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Department of Science & Basic Studies (DSBS)</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total FDPs</CardTitle>
              <Trophy className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalFdps}</div>
              <p className="text-xs opacity-80 mt-1">Across DSBS faculty</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Faculty</CardTitle>
              <Users className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalFaculty}</div>
              <p className="text-xs opacity-80 mt-1">{analytics.activeFaculty} with FDPs</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Avg FDPs/Faculty</CardTitle>
              <Target className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.avgFdpsPerFaculty}</div>
              <p className="text-xs opacity-80 mt-1">Performance metric</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Certificate Rate</CardTitle>
              <Award className="h-5 w-5 opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics.totalFdps > 0 ?
                  ((analytics.certificateStats.with_certificate / analytics.totalFdps) * 100).toFixed(0) : '0'}%
              </div>
              <p className="text-xs opacity-80 mt-1">
                {analytics.certificateStats.with_certificate}/{analytics.totalFdps} with certificates
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* FDPs Over Time */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">FDP Participation Trend</CardTitle>
              </div>
              <p className="text-sm text-gray-600">Monthly FDP participation over the last 2 years</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={analytics.trendData}>
                  <defs>
                    <linearGradient id="colorFdps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="fdps" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorFdps)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Certificate Distribution */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                <CardTitle className="text-lg">Certificate Distribution</CardTitle>
              </div>
              <p className="text-sm text-gray-600">FDPs with and without certificates</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={analytics.certificatePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={40}
                  >
                    {analytics.certificatePieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* FDPs by Organizer */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg">Top FDP Organizers</CardTitle>
            </div>
            <p className="text-sm text-gray-600">Most frequent FDP organizing institutions</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={analytics.organizerData.slice(0, 10)} margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="organizer" 
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Faculty-wise FDPs */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-lg">Top Performing Faculty</CardTitle>
            </div>
            <p className="text-sm text-gray-600">Faculty members with highest FDP participation</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={analytics.facultyPerformance
                  .filter(f => f.fdp_count > 0)
                  .slice(0, 10)
                  .map(f => ({
                    name: (f.full_name || f.email || '').length > 20 
                      ? (f.full_name || f.email || '').substring(0, 20) + '...'
                      : (f.full_name || f.email || ''),
                    FDPs: f.fdp_count,
                    Certificates: f.has_certificate
                  }))
                }
                layout="vertical"
                margin={{ left: 120, right: 30, top: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" allowDecimals={false} fontSize={12} />
                <YAxis dataKey="name" type="category" width={140} fontSize={11} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Legend />
                <Bar dataKey="FDPs" fill="#3B82F6" radius={[0, 2, 2, 0]} />
                <Bar dataKey="Certificates" fill="#10B981" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Faculty FDP Participation Overview */}
        {analytics.facultyPerformance.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-gray-600" />
                    <CardTitle className="text-lg">Faculty FDP Participation Overview</CardTitle>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Detailed view of all faculty FDP activities</p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search faculty..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors w-full sm:w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left p-4 font-semibold text-gray-700">Rank</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Name</th>
                      <th className="text-right p-4 font-semibold text-gray-700">Total FDPs</th>
                      <th className="text-right p-4 font-semibold text-gray-700">Recent FDPs</th>
                      <th className="text-right p-4 font-semibold text-gray-700">With Certificates</th>
                      <th className="text-left p-4 font-semibold text-gray-700">Latest FDP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFacultyPerformance.slice(0, 20).map((faculty, index) => (
                      <tr
                        key={faculty.id}
                        className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedFaculty(faculty);
                          setShowModal(true);
                        }}
                      >
                        <td className="p-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold text-sm">
                            {analytics.facultyPerformance.findIndex(f => f.id === faculty.id) + 1}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-800">
                            {faculty.full_name || faculty.email}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {faculty.fdp_count}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-gray-600">{faculty.recent_fdps}</span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {faculty.has_certificate}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {faculty.latest_fdp ? new Date(faculty.latest_fdp).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredFacultyPerformance.length === 0 && searchTerm && (
                  <div className="text-center py-8 text-gray-500">
                    No faculty found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal for certificate details */}
        {showModal && <Modal />}

        {/* No Data Message */}
        {analytics.totalFdps === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-16">
              <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No FDP Data Available</h3>
              <p className="text-gray-500">Add some FDP certificates to faculty members to see detailed analytics.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FacultyDataView;