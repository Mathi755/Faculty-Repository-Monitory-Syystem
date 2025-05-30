import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast"; // Assuming you're using a toast component
import { supabase } from "@/integrations/supabase/client";

const FacultyDataView = () => {
  const [fdpCertifications, setFdpCertifications] = useState<any[]>([]);

  const fetchFDPCertifications = async () => {
    try {
      const { data, error } = await supabase
        .from("fdp_certifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setFdpCertifications(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching FDP certifications",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchFDPCertifications();
  }, []);

  return (
    <div className="mx-4">
      <div className="text-xl my-2">FDP Certificates</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fdpCertifications.map((cert, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{cert.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Optional: Add more fields like cert.date, cert.organizer etc. */}
              <p className="text-sm text-muted-foreground">
                {cert.description || "No description available."}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FacultyDataView;
