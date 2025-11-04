import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, User, Award } from "lucide-react";

interface JoinRequest {
  id: string;
  student_id: string;
  class_id: string;
  status: string;
  created_at: string;
  profiles: { full_name: string; student_id: string };
  tuition_classes: { name: string };
}

export function JoinRequestsManagement() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from("join_requests")
      .select(`
        *,
        profiles(full_name, student_id),
        tuition_classes(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load join requests");
    } else {
      setRequests(data as unknown as JoinRequest[]);
    }
    setLoading(false);
  };

  const handleApprove = async (requestId: string, studentId: string, classId: string) => {
    // Update request status
    const { error: updateError } = await supabase
      .from("join_requests")
      .update({ status: "approved" })
      .eq("id", requestId);

    if (updateError) {
      toast.error("Failed to approve request");
      return;
    }

    // Add student to class
    const { error: insertError } = await supabase
      .from("class_students")
      .insert({
        student_id: studentId,
        class_id: classId,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        toast.error("Student is already in this class");
      } else {
        toast.error("Failed to add student to class");
      }
      return;
    }

    toast.success("Request approved! Student added to class");
    fetchRequests();
  };

  const handleReject = async (requestId: string) => {
    const { error } = await supabase
      .from("join_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      toast.error("Failed to reject request");
    } else {
      toast.success("Request rejected");
      fetchRequests();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "pending");

  return (
    <Card className="border-2">
      <CardHeader className="bg-gradient-subtle border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Join Requests Management
            </CardTitle>
            <CardDescription className="mt-1">
              Review and approve student requests to join tuition classes
            </CardDescription>
          </div>
          {pendingRequests.length > 0 && (
            <Badge className="bg-primary text-lg px-3 py-1">
              {pendingRequests.length} Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-2">All caught up!</p>
            <p className="text-muted-foreground">No pending join requests at the moment</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-5 border-2 rounded-lg hover:border-primary/50 transition-all hover:shadow-md bg-card"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{request.profiles.full_name}</span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {request.profiles.student_id}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        wants to join: <span className="font-semibold text-foreground">{request.tuition_classes.name}</span>
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground ml-[52px]">
                    Requested on: {new Date(request.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="default"
                    onClick={() => handleApprove(request.id, request.student_id, request.class_id)}
                    className="bg-success hover:bg-success/90 text-success-foreground gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </Button>
                  <Button
                    size="default"
                    variant="destructive"
                    onClick={() => handleReject(request.id)}
                    className="gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show recent approved/rejected requests */}
        {requests.filter(r => r.status !== "pending").length > 0 && (
          <div className="mt-8 pt-6 border-t">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Recent Actions
            </h4>
            <div className="space-y-2">
              {requests
                .filter(r => r.status !== "pending")
                .slice(0, 5)
                .map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{request.profiles.full_name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm text-muted-foreground">{request.tuition_classes.name}</span>
                    </div>
                    <Badge 
                      variant={request.status === "approved" ? "default" : "destructive"}
                      className={request.status === "approved" ? "bg-success" : ""}
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
