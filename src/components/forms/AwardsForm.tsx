import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Upload, Plus, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AwardData {
  id: string;
  title: string;
  issuing_body: string;
  date_awarded: string;
  certificate_url: string | null;
  created_at: string;
}

const AwardsForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    issuingBody: '',
    dateAwarded: undefined as Date | undefined,
    certificate: null as File | null
  });

  const [awards, setAwards] = useState<AwardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndFetchAwards();
  }, []);

  const checkAuthAndFetchAwards = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setCurrentUser(null);
        setAwards([]);
        return;
      }
      setCurrentUser(user);
      await fetchAwards(user.id);
    } catch (error) {
      setCurrentUser(null);
      setAwards([]);
    }
  };

  const fetchAwards = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('awards')
        .select('*')
        .eq('user_id', userId)
        .order('date_awarded', { ascending: false });

      if (error) throw error;
      setAwards(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching awards",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.issuingBody || !formData.dateAwarded) {
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
        const fileName = `${currentUser.id}/awards/${Date.now()}.${fileExt}`;

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
        .from('awards')
        .insert({
          user_id: currentUser.id,
          title: formData.title,
          issuing_body: formData.issuingBody,
          date_awarded: format(formData.dateAwarded, "yyyy-MM-dd"),
          certificate_url: certificateUrl
        });

      if (error) throw error;

      setFormData({
        title: '',
        issuingBody: '',
        dateAwarded: undefined,
        certificate: null
      });

      await fetchAwards(currentUser.id);

      toast({
        title: "Award Added",
        description: "Your award/recognition has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding award",
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Awards & Recognition</h2>
        <p className="text-gray-600">Document your achievements and honors</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Add New Award</span>
            </CardTitle>
            <CardDescription>
              Enter details of your award or recognition
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Award Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter award title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="issuingBody">Issuing Body *</Label>
                <Input
                  id="issuingBody"
                  value={formData.issuingBody}
                  onChange={(e) => setFormData({ ...formData, issuingBody: e.target.value })}
                  placeholder="Enter issuing organization/institution"
                  required
                />
              </div>

              <div>
                <Label>Date Awarded *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !formData.dateAwarded && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dateAwarded ? format(formData.dateAwarded, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dateAwarded}
                      onSelect={(date) => setFormData({ ...formData, dateAwarded: date })}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="certificate">Upload Certificate/Letter</Label>
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
                {loading ? "Adding..." : "Add Award"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Awards List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Your Awards</span>
            </CardTitle>
            <CardDescription>
              View and manage your achievements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {awards.map((award) => (
                <div key={award.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-gray-900">{award.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600">{award.issuing_body}</p>
                  <p className="text-xs text-gray-500">
                    Awarded: {format(new Date(award.date_awarded), "MMMM dd, yyyy")}
                  </p>
                  {award.certificate_url && (
                    <a
                      href={award.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View Certificate
                    </a>
                  )}
                </div>
              ))}
              {awards.length === 0 && (
                <p className="text-center text-gray-500 py-8">No awards added yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AwardsForm;