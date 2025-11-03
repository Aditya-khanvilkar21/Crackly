import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

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
    <Card>
      <CardHeader>
        <CardTitle>Join Requests</CardTitle>
        <CardDescription>
          Manage student requests to join tuition classes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No pending join requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{request.profiles.full_name}</span>
                    <Badge variant="outline">{request.profiles.student_id}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    wants to join: <span className="font-medium">{request.tuition_classes.name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested: {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id, request.student_id, request.class_id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(request.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show recent approved/rejected requests */}
        {requests.filter(r => r.status !== "pending").length > 0 && (
          <div className="mt-8">
            <h4 className="font-semibold mb-4">Recent Actions</h4>
            <div className="space-y-2">
              {requests
                .filter(r => r.status !== "pending")
                .slice(0, 5)
                .map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                  >
                    <span>
                      {request.profiles.full_name} - {request.tuition_classes.name}
                    </span>
                    <Badge className={request.status === "approved" ? "bg-green-600" : "bg-red-600"}>
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
