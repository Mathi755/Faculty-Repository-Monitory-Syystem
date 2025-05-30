import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Calendar, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";

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
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const initialFormState = {
  course: '',
  course_code: '',
  semester: '',
  section: '',
  day_order: '',
  day: '',
  time_slot: '',
  room: '',
  credits: ''
};

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

const TimetableForm = () => {
  const [formData, setFormData] = useState(initialFormState);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  // Fetch timetable for current user
  const fetchTimetable = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setCurrentUser(null);
      setTimetable([]);
      return;
    }
    setCurrentUser(user);
    const { data, error } = await supabase
      .from('timetables')
      .select('*')
      .eq('user_id', user.id)
      .order('day_order', { ascending: true });
    if (!error) setTimetable(data || []);
    else setTimetable([]);
  };

  useEffect(() => {
    fetchTimetable();
    // eslint-disable-next-line
  }, []);

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

  // Handle add or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (
      !formData.course ||
      !formData.course_code ||
      !formData.day_order ||
      !formData.day ||
      selectedTimeSlots.length === 0
    ) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (editId) {
        // Only update the single slot in edit mode
        const { error } = await supabase
          .from('timetables')
          .update({
            ...formData,
            day_order: Number(formData.day_order),
            time_slot: selectedTimeSlots[0],
            credits: formData.credits ? Number(formData.credits) : null,
            user_id: currentUser.id
          })
          .eq('id', editId);
        if (error) throw error;
        toast({ title: "Class Updated", description: "Your class schedule has been updated." });
      } else {
        // Insert multiple slots
        const inserts = selectedTimeSlots.map((slot) => ({
          ...formData,
          day_order: Number(formData.day_order),
          time_slot: slot,
          credits: formData.credits ? Number(formData.credits) : null,
          user_id: currentUser.id
        }));
        const { error } = await supabase.from('timetables').insert(inserts);
        if (error) throw error;
        toast({ title: "Class Added", description: "Your class schedule has been added." });
      }
      setFormData(initialFormState);
      setEditId(null);
      setSelectedTimeSlots([]);
      fetchTimetable();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Edit handler
  const handleEdit = (entry: any) => {
    setEditId(entry.id);
    setFormData({
      course: entry.course || '',
      course_code: entry.course_code || '',
      semester: entry.semester || '',
      section: entry.section || '',
      day_order: entry.day_order?.toString() || '',
      day: entry.day || '',
      time_slot: entry.time_slot || '',
      room: entry.room || '',
      credits: entry.credits?.toString() || ''
    });
  };

  // Delete handler
  const handleDelete = async (id: string) => {
    await supabase.from('timetables').delete().eq('id', id);
    fetchTimetable();
  };

  // Download timetable as CSV
  const handleDownloadTimetable = () => {
    // Header row
    const headers = ["Day Order", ...timeSlots];
    // Each row: [day_order, ...subject info for each slot]
    const rows = dayOrders.map((order) => {
      const row = [order];
      timeSlots.forEach((slot) => {
        const entry = getClassForCell(order, slot);
        if (entry) {
          // You can customize this string as needed
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
    a.download = "timetable_matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download timetable as image
  const handleDownloadImage = async () => {
    if (tableRef.current) {
      const canvas = await html2canvas(tableRef.current, { backgroundColor: null });
      const link = document.createElement("a");
      link.download = "timetable_matrix.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  // Helper: Get class for a given day_order and time_slot (ignore day in frontend)
  const getClassForCell = (dayOrder: number, timeSlot: string) => {
    return timetable.find(
      (entry) =>
        Number(entry.day_order) === dayOrder &&
        entry.time_slot === timeSlot
    );
  };

  // When editing, set selectedTimeSlots to the single slot
  useEffect(() => {
    if (editId && formData.time_slot) {
      setSelectedTimeSlots([formData.time_slot]);
    }
  }, [editId, formData.time_slot]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Timetable</h2>
        <p className="text-gray-600">Manage your teaching schedule for the current semester</p>
      </div>

      {/* Timetable Matrix Preview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Timetable Matrix Preview</span>
          </CardTitle>
          <CardDescription>
            Day Orders as rows, Time Slots as columns. Subjects are color-coded. (Day is stored but not shown here)
          </CardDescription>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              onClick={handleDownloadTimetable}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Timetable (CSV)
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadImage}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Timetable (Image)
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* Manual Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>{editId ? "Edit Class Schedule" : "Add Class Schedule"}</span>
          </CardTitle>
          <CardDescription>
            {editId
              ? "Edit the details of your scheduled class."
              : "Manually enter individual class details. You can select multiple time slots for a day order when adding."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="course">Course Name *</Label>
              <Input
                id="course"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                placeholder="Enter course name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="course_code">Course Code *</Label>
                <Input
                  id="course_code"
                  value={formData.course_code}
                  onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                  placeholder="e.g., CS201"
                  required
                />
              </div>
              <div>
                <Label htmlFor="semester">Semester</Label>
                <Input
                  id="semester"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  placeholder="e.g., 3rd Semester"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  placeholder="e.g., A"
                />
              </div>
              <div>
                <Label htmlFor="day_order">Day Order *</Label>
                <Select value={formData.day_order} onValueChange={(value) => { setFormData({ ...formData, day_order: value }); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select day order" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOrders.map((order) => (
                      <SelectItem key={order} value={order.toString()}>{order}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="day">Day *</Label>
              <Select value={formData.day} onValueChange={(value) => setFormData({ ...formData, day: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {days.map((day) => (
                    <SelectItem key={day} value={day}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Time Slot{editId ? "" : "s"} *</Label>
              {editId ? (
                <Select value={selectedTimeSlots[0] || ""} onValueChange={v => setSelectedTimeSlots([v])}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((slot) => (
                    <label key={slot} className="flex items-center space-x-1">
                      <input
                        type="checkbox"
                        checked={selectedTimeSlots.includes(slot)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedTimeSlots([...selectedTimeSlots, slot]);
                          } else {
                            setSelectedTimeSlots(selectedTimeSlots.filter(s => s !== slot));
                          }
                        }}
                      />
                      <span>{slot}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room">Room/Venue</Label>
                <Input
                  id="room"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                  placeholder="Room number/venue"
                />
              </div>
              <div>
                <Label htmlFor="credits">Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  placeholder="Course credits"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {editId ? "Update Class" : "Add to Schedule"}
            </Button>
            {editId && (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={() => {
                  setEditId(null);
                  setFormData(initialFormState);
                  setSelectedTimeSlots([]);
                }}
              >
                Cancel Edit
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimetableForm;