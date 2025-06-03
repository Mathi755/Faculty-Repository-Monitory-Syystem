import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { Users, Target, Award, Search, FileText } from "lucide-react";

interface FacultyProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  department?: string | null;
  designation?: string | null;
}

interface Patent {
  id: string;
  user_id: string;
  title: string;
  status: string;
  document_url?: string | null;
  created_at: string;
}

const PatentsDashboard = () => {
  const [faculties, setFaculties] = useState<FacultyProfile[]>([]);
  const [patents, setPatents] = useState<Patent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: facultyData } = await supabase
          .from("profiles")
          .select("id, email, full_name, department, designation");
        const { data: patentData } = await supabase
          .from("patents")
          .select("*")
          .order("created_at", { ascending: false });
        setFaculties(facultyData || []);
        setPatents(patentData || []);
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

    const filteredPatents = patents.filter(pat =>
      filteredFaculties.some(f => f.id === pat.user_id)
    );

    // By Department
    const departments = [...new Set(faculties.map(f => f.department).filter(Boolean))];
    const patentsByDepartment = departments.map(dept => {
      const deptFaculties = faculties.filter(f => f.department === dept);
      const deptPatents = patents.filter(pat =>
        deptFaculties.some(f => f.id === pat.user_id)
      );
      return {
        department: dept || 'Unknown',
        patents: deptPatents.length,
        faculty_count: deptFaculties.length,
        avg_patents: deptFaculties.length > 0 ? (deptPatents.length / deptFaculties.length).toFixed(1) : 0
      };
    });

    // By Designation
    const designations = [...new Set(faculties.map(f => f.designation).filter(Boolean))];
    const patentsByDesignation = designations.map(designation => {
      const desigFaculties = faculties.filter(f => f.designation === designation);
      const desigPatents = patents.filter(pat =>
        desigFaculties.some(f => f.id === pat.user_id)
      );
      return {
        designation: designation || 'Unknown',
        patents: desigPatents.length,
        faculty_count: desigFaculties.length
      };
    });

    // Monthly Trends
    const monthlyTrends = filteredPatents.reduce((acc, pat) => {
      const month = pat.created_at.substring(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const trendData = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        monthKey: month,
        patents: count
      }));

    // By Status
    const statuses = [...new Set(filteredPatents.map(pat => pat.status))];
    const statusData = statuses.map(status => ({
      status,
      count: filteredPatents.filter(pat => pat.status === status).length
    })).sort((a, b) => b.count - a.count);

    // Top Performers
    const facultyPerformance = filteredFaculties.map(faculty => {
      const facultyPatents = patents.filter(pat => pat.user_id === faculty.id);
      const currentYear = new Date().getFullYear();
      const recentPatents = facultyPatents.filter(pat =>
        new Date(pat.created_at).getFullYear() >= currentYear - 1
      );
      return {
        ...faculty,
        patent_count: facultyPatents.length,
        recent_patents: recentPatents.length,
        has_document: facultyPatents.filter(pat => pat.document_url).length,
        latest_patent: facultyPatents.length > 0 ?
          facultyPatents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : null
      };
    }).sort((a, b) => b.patent_count - a.patent_count);

    // Document Stats
    const documentStats = {
      with_document: filteredPatents.filter(pat => pat.document_url).length,
      without_document: filteredPatents.filter(pat => !pat.document_url).length,
      total: filteredPatents.length
    };

    // Yearly Trends
    const yearlyPatents = filteredPatents.reduce((acc, pat) => {
      const year = new Date(pat.created_at).getFullYear();
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const yearlyData = Object.entries(yearlyPatents)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, count]) => ({
        year: parseInt(year),
        patents: count
      }));

    return {
      departmentData: patentsByDepartment,
      designationData: patentsByDesignation,
      trendData,
      statusData,
      facultyPerformance,
      documentStats,
      yearlyData,
      totalPatents: filteredPatents.length,
      totalFaculty: filteredFaculties.length,
      avgPatentsPerFaculty: filteredFaculties.length > 0 ? (filteredPatents.length / filteredFaculties.length).toFixed(1) : '0',
      activeFaculty: filteredFaculties.filter(f =>
        patents.some(pat => pat.user_id === f.id)
      ).length
    };
  };

  const analytics = getAnalytics();
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#ffb347'];
  const departments = [...new Set(faculties.map(f => f.department).filter(Boolean))];

  // Filter faculty based on search term
  const filteredFacultyPerformance = analytics?.facultyPerformance?.filter(faculty =>
    (faculty.full_name || faculty.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Modal for patent details
  const Modal = () => {
    if (!selectedFaculty) return null;
    const facultyPatents = patents.filter(pat => pat.user_id === selectedFaculty.id);

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
            {facultyPatents.length === 0 ? (
              <div className="text-center py-12">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-500">No patents found.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {facultyPatents.map((pat) => (
                  <div key={pat.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="font-semibold text-gray-800 mb-2">{pat.title}</div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div><span className="font-medium">Status:</span> {pat.status}</div>
                      <div><span className="font-medium">Created:</span> {new Date(pat.created_at).toLocaleDateString()}</div>
                    </div>
                    {pat.document_url ? (
                      <div className="mt-3 flex gap-2">
                        <a
                          href={pat.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-1" /> View Document
                        </a>
                        <a
                          href={pat.document_url}
                          download
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-1" /> Download
                        </a>
                      </div>
                    ) : (
                      <span className="inline-block mt-2 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                        No document file
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
        <h1 className="text-3xl font-bold text-gray-800">Patents Dashboard</h1>
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
            <CardTitle className="text-sm font-medium">Total Patents</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalPatents}</div>
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
            <p className="text-xs text-muted-foreground">{analytics.activeFaculty} with patents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Patents/Faculty</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgPatentsPerFaculty}</div>
            <p className="text-xs text-muted-foreground">Performance metric</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Document Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.totalPatents > 0 ?
                ((analytics.documentStats.with_document / analytics.totalPatents) * 100).toFixed(0) : '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.documentStats.with_document}/{analytics.totalPatents} with documents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patents by Department */}
        {analytics.departmentData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Patents by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="patents" fill="#8884d8" name="Patents" />
                  <Bar dataKey="faculty_count" fill="#82ca9d" name="Faculty Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Patents by Designation */}
        {analytics.designationData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Patents by Designation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.designationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ designation, patents }) => `${designation}: ${patents}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="patents"
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
              <CardTitle>Patent Trends (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="patents" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* By Status */}
        {analytics.statusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Patents by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.statusData.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="status" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Yearly Patents Trend */}
      {analytics.yearlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yearly Patent Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="patents" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

     

      {/* Faculty Patents Contribution Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg">Faculty Patents Contribution Overview</CardTitle>
              </div>
              <p className="text-sm text-gray-600 mt-1">Detailed view of all faculty patent activities</p>
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
                  <th className="text-left p-4 font-semibold text-gray-700">Department</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Designation</th>
                  <th className="text-right p-4 font-semibold text-gray-700">Total Patents</th>
                  <th className="text-right p-4 font-semibold text-gray-700">Recent Patents</th>
                  <th className="text-right p-4 font-semibold text-gray-700">With Documents</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Latest Patent</th>
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
                    <td className="p-4 font-medium text-gray-800">{faculty.full_name || faculty.email}</td>
                    <td className="p-4">{faculty.department || 'N/A'}</td>
                    <td className="p-4">{faculty.designation || 'N/A'}</td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {faculty.patent_count}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-600">{faculty.recent_patents}</td>
                    <td className="p-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {faculty.has_document}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {faculty.latest_patent ? new Date(faculty.latest_patent).toLocaleDateString() : 'N/A'}
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

      {/* Modal for patent details */}
      {showModal && <Modal />}

      {/* No Data Message */}
      {analytics.totalPatents === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Patents Data Available</h3>
            <p className="text-gray-500">Add some patents to see detailed analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatentsDashboard;