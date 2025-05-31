import React, { useEffect, useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";

// Add Combobox from shadcn/ui or your own implementation
import { Combobox } from "@/components/ui/combobox"; // You may need to create this if not present

const timeSlots = [
  "8:00 AM - 8:50 AM",
  "8:50 AM - 9:45 AM",
  "9:50 AM - 10:40 AM",
  "10:40 AM - 11:30 AM",
  "11:30 AM - 12:25 PM",
  "12:30 PM - 1:20 PM",
  "1:20 PM - 2:15 PM",
  "2:20 PM - 3:10 PM",
  "3:10 PM - 4:00 PM",
  "4:00 PM - 4:50 PM"
];
const dayOrders = [1, 2, 3, 4, 5];

const colorPalette = [
  "bg-blue-200 text-blue-900",
  "bg-green-200 text-green-900",
  "bg-yellow-200 text-yellow-900",
  "bg-pink-200 text-pink-900",
  "bg-purple-200 text-purple-900",
  "bg-orange-200 text-orange-900",
  "bg-teal-200 text-teal-900",
  "bg-red-200 text-red-900",
  "bg-indigo-200 text-indigo-900",
  "bg-cyan-200 text-cyan-900"
];

const TimetableDashboard = () => {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const tableRef = useRef<HTMLDivElement>(null);

  // Fetch all faculties
  useEffect(() => {
    const fetchFaculties = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, department, designation");
      setFaculties(data || []);
    };
    fetchFaculties();
  }, []);

  // Fetch timetable for selected faculty
  useEffect(() => {
    if (!selectedFacultyId) {
      setTimetable([]);
      return;
    }
    const fetchTimetable = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("timetables")
        .select("*")
        .eq("user_id", selectedFacultyId)
        .order("day_order", { ascending: true });
      setTimetable(error ? [] : data || []);
      setLoading(false);
    };
    fetchTimetable();
  }, [selectedFacultyId]);

  // Assign a color to each unique course_code (or course name if code is missing)
  const courseColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    let colorIdx = 0;
    timetable.forEach((entry) => {
      const key = entry.course_code || entry.course;
      if (!map[key]) {
        map[key] = colorPalette[colorIdx % colorPalette.length];
        colorIdx++;
      }
    });
    return map;
  }, [timetable]);

  // Helper: Get class for a given day_order and time_slot
  const getClassForCell = (dayOrder: number, timeSlot: string) => {
    return timetable.find(
      (entry) =>
        Number(entry.day_order) === dayOrder &&
        entry.time_slot === timeSlot
    );
  };

  // Download timetable as image
  const handleDownloadImage = async () => {
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current, { backgroundColor: null });
      const link = document.createElement("a");
      link.download = "faculty_timetable_matrix.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  // Download timetable as CSV
  const handleDownloadTimetable = () => {
    const headers = ["Day Order", ...timeSlots];
    const rows = dayOrders.map((order) => {
      const row = [order];
      timeSlots.forEach((slot) => {
        const entry = getClassForCell(order, slot);
        if (entry) {
          row.push(
            `${entry.course} (${entry.course_code})${entry.section ? ` Sec:${entry.section}` : ""}${entry.room ? ` Room:${entry.room}` : ""}${entry.credits ? ` Cr:${entry.credits}` : ""}${entry.day ? ` [${entry.day}]` : ""}`
          );
        } else {
          row.push("");
        }
      });
      return row;
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faculty_timetable_matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter faculties based on search
  const filteredFaculties = useMemo(() => {
    if (!search) return faculties;
    return faculties.filter(fac =>
      (fac.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (fac.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (fac.department || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, faculties]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Faculty Timetable Viewer</h2>
        <p className="text-gray-600 mb-4">Search and select a faculty to view their timetable in matrix format.</p>
        <div className="max-w-xs">
          {/* Combobox with search */}
          <Combobox
            value={selectedFacultyId}
            onChange={setSelectedFacultyId}
            inputValue={search}
            onInputChange={setSearch}
            options={filteredFaculties.map(fac => ({
              value: fac.id,
              label: `${fac.full_name || fac.email}${fac.department ? ` (${fac.department})` : ""}`
            }))}
            placeholder="Search faculty..."
            emptyMessage="No faculty found"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Timetable Matrix Preview</span>
          </CardTitle>
          <CardDescription>
            Day Orders as rows, Time Slots as columns. Subjects are color-coded.
          </CardDescription>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={handleDownloadTimetable}
              disabled={!selectedFacultyId || timetable.length === 0}
            >
              Download Timetable (CSV)
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadImage}
              disabled={!selectedFacultyId || timetable.length === 0}
            >
              Download Timetable (Image)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading timetable...</div>
          ) : !selectedFacultyId ? (
            <div className="text-center text-gray-400 py-8">Search and select a faculty to view timetable.</div>
          ) : timetable.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No timetable data for this faculty.</div>
          ) : (
            <div ref={tableRef} className="overflow-x-auto">
              <table className="min-w-full border text-xs">
                <thead>
                  <tr>
                    <th className="p-2 border bg-gray-100">Day Order</th>
                    {timeSlots.map((slot) => (
                      <th key={slot} className="p-2 border bg-gray-100">{slot}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayOrders.map((order) => (
                    <tr key={order}>
                      <td className="p-2 border font-bold bg-gray-50">{order}</td>
                      {timeSlots.map((slot) => {
                        const entry = getClassForCell(order, slot);
                        if (entry) {
                          const colorClass = courseColorMap[entry.course_code || entry.course] || "bg-gray-200";
                          return (
                            <td key={slot} className={`p-2 border align-top rounded ${colorClass}`}>
                              <div>
                                <div className="font-semibold">{entry.course}</div>
                                <div className="text-xs">{entry.course_code}</div>
                                <div className="text-xs">{entry.section ? `Sec: ${entry.section}` : ""}</div>
                                <div className="text-xs">{entry.room}</div>
                                <div className="text-xs">{entry.credits ? `Cr: ${entry.credits}` : ""}</div>
                                <div className="text-xs italic text-gray-500">{entry.day}</div>
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td key={slot} className="p-2 border align-top">
                            <span className="text-gray-300">-</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimetableDashboard;