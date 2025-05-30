import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Upload, Plus, Calendar as CalendarEventIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Workshop {
  id: string;
  event_name: string;
  organizer: string;
  duration_from: string;
  duration_to: string;
  certificate_url: string | null;
  created_at: string;
}

const WorkshopForm = () => {
  const [formData, setFormData] = useState({
    eventName: '',
    organizer: '',
    fromDate: undefined as Date | undefined,
    toDate: undefined as Date | undefined,
    certificate: null as File | null
  });

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndFetchWorkshops();
  }, []);

  const checkAuthAndFetchWorkshops = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setCurrentUser(null);
        setWorkshops([]);
        return;
      }
      setCurrentUser(user);
      await fetchWorkshops(user.id);
    } catch (error) {
      setCurrentUser(null);
      setWorkshops([]);
    }
  };

  const fetchWorkshops = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkshops(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching workshops",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.eventName || !formData.organizer || !formData.fromDate || !formData.toDate) {
      toast({
        title: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (!currentUser) throw new Error('User not authenticated');

      let certificateUrl = null;

      // Upload certificate if provided
      if (formData.certificate) {
        const fileExt = formData.certificate.name.split('.').pop();
        const fileName = `${currentUser.id}/workshops/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('academic-files')
          .upload(fileName, formData.certificate);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('academic-files')
          .getPublicUrl(fileName);

        certificateUrl = publicUrl;
      }

      const { error } = await supabase
        .from('workshops')
        .insert({
          user_id: currentUser.id,
          event_name: formData.eventName,
          organizer: formData.organizer,
          duration_from: formData.fromDate.toISOString().split("T")[0],
          duration_to: formData.toDate.toISOString().split("T")[0],
          certificate_url: certificateUrl
        });

      if (error) throw error;

      setFormData({
        eventName: '',
        organizer: '',
        fromDate: undefined,
        toDate: undefined,
        certificate: null
      });

      await fetchWorkshops(currentUser.id);

      toast({
        title: "Event Added",
        description: "Your workshop/conference attendance has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, certificate: file });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Workshops & Conferences</h2>
        <p className="text-gray-600">Track your professional development events</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add Event Attendance</span>
            </CardTitle>
            <CardDescription>
              Enter details of workshops or conferences attended
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="eventName">Name of Event *</Label>
                <Input
                  id="eventName"
                  value={formData.eventName}
                  onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                  placeholder="Enter workshop or conference name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="organizer">Organizer *</Label>
                <Input
                  id="organizer"
                  value={formData.organizer}
                  onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                  placeholder="Enter organizing institution/body"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !formData.fromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.fromDate ? format(formData.fromDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.fromDate}
                        onSelect={(date) => setFormData({ ...formData, fromDate: date })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>To Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1",
                          !formData.toDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.toDate ? format(formData.toDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.toDate}
                        onSelect={(date) => setFormData({ ...formData, toDate: date })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label htmlFor="certificate">Upload Participation Certificate</Label>
                <div className="mt-1 flex items-center space-x-2">
                  <Input
                    id="certificate"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('certificate')?.click()}
                    className="flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Choose File</span>
                  </Button>
                  {formData.certificate && (
                    <span className="text-sm text-gray-600">{formData.certificate.name}</span>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Adding..." : "Add Event"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Workshops List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarEventIcon className="h-5 w-5" />
              <span>Events Attended</span>
            </CardTitle>
            <CardDescription>
              View your workshop and conference attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workshops.map((workshop) => (
                <div key={workshop.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900">{workshop.event_name}</h4>
                    <span className={cn(
                      "px-2 py-1 text-xs rounded-full",
                      "bg-blue-100 text-blue-800"
                    )}>
                      {new Date(workshop.duration_to).getTime() - new Date(workshop.duration_from).getTime() > 2 * 24 * 60 * 60 * 1000
                        ? "Conference"
                        : "Workshop"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{workshop.organizer}</p>
                  <p className="text-xs text-gray-500">
                    Duration: {format(new Date(workshop.duration_from), "MMM dd, yyyy")} - {format(new Date(workshop.duration_to), "MMM dd, yyyy")}
                  </p>
                  {workshop.certificate_url && (
                    <a
                      href={workshop.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View Certificate
                    </a>
                  )}
                </div>
              ))}
              {workshops.length === 0 && (
                <p className="text-center text-gray-500 py-8">No events added yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkshopForm;
