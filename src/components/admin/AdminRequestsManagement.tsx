import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Clock, UserPlus } from "lucide-react";

interface AdminRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
}

export const AdminRequestsManagement = () => {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load admin requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: AdminRequest) => {
    setProcessingId(request.id);
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from("admin_requests")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Add admin role to user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: request.user_id, role: "admin" });

      if (roleError) throw roleError;

      toast.success(`${request.full_name} has been approved as Admin`);
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error("Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: AdminRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from("admin_requests")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString()
        })
        .eq("id", request.id);

      if (error) throw error;

      toast.success(`${request.full_name}'s request has been rejected`);
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Admin Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending admin requests
            </p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-500/10">
                      <UserPlus className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{request.full_name}</p>
                      <p className="text-xs text-muted-foreground">{request.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleReject(request)}
                      disabled={processingId === request.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {processedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium text-sm">{request.full_name}</p>
                    <p className="text-xs text-muted-foreground">{request.email}</p>
                  </div>
                  <Badge
                    variant={request.status === "approved" ? "default" : "destructive"}
                  >
                    {request.status === "approved" ? "Approved" : "Rejected"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
