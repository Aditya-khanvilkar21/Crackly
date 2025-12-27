import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Users, Ban, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TuitionClass {
  id: string;
  name: string;
  created_at: string;
  student_count?: number;
  is_disabled?: boolean;
}

interface ClassManagementProps {
  userRole: string;
}

export const ClassManagement = ({ userRole }: ClassManagementProps) => {
  const [classes, setClasses] = useState<TuitionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const [editingClass, setEditingClass] = useState<TuitionClass | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("tuition_classes")
        .select(`
          *,
          class_students(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const classesWithCount = data.map(cls => ({
        ...cls,
        student_count: cls.class_students?.[0]?.count || 0
      }));

      setClasses(classesWithCount);
    } catch (error: any) {
      toast({
        title: "Error fetching classes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      toast({
        title: "Invalid input",
        description: "Please enter a class name",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("tuition_classes")
        .insert([{ name: newClassName, admin_id: session.user.id }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Class created successfully",
      });

      setNewClassName("");
      setIsCreateOpen(false);
      fetchClasses();
    } catch (error: any) {
      toast({
        title: "Error creating class",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateClass = async () => {
    if (!editingClass || !editingClass.name.trim()) return;

    try {
      const { error } = await supabase
        .from("tuition_classes")
        .update({ name: editingClass.name })
        .eq("id", editingClass.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Class updated successfully",
      });

      setIsEditOpen(false);
      setEditingClass(null);
      fetchClasses();
    } catch (error: any) {
      toast({
        title: "Error updating class",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this class? This will also remove all student associations.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("tuition_classes")
        .delete()
        .eq("id", classId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Class deleted successfully",
      });

      fetchClasses();
    } catch (error: any) {
      toast({
        title: "Error deleting class",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleDisable = async (cls: TuitionClass) => {
    try {
      const newStatus = !cls.is_disabled;
      const { error } = await supabase
        .from("tuition_classes")
        .update({ is_disabled: newStatus })
        .eq("id", cls.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Class ${newStatus ? 'disabled' : 'enabled'} successfully`,
      });

      fetchClasses();
    } catch (error: any) {
      toast({
        title: "Error updating class status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Tuition Classes</CardTitle>
              <CardDescription>Manage your tuition classes and students</CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                  <DialogDescription>Enter a name for the new tuition class</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="className">Class Name</Label>
                    <Input
                      id="className"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="e.g., JEE 2025 Batch A"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateClass}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No classes found. Create your first class to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id} className={cls.is_disabled ? 'opacity-60' : ''}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>
                      {cls.is_disabled ? (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" />
                          Disabled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-green-500/30 text-green-600 bg-green-500/10">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {cls.student_count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(cls.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {userRole === 'super_admin' && (
                          <Button
                            size="sm"
                            variant={cls.is_disabled ? "outline" : "secondary"}
                            onClick={() => handleToggleDisable(cls)}
                            title={cls.is_disabled ? "Enable Class" : "Disable Class"}
                          >
                            {cls.is_disabled ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingClass(cls);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClass(cls.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Update the class name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editClassName">Class Name</Label>
              <Input
                id="editClassName"
                value={editingClass?.name || ""}
                onChange={(e) =>
                  setEditingClass(
                    editingClass ? { ...editingClass, name: e.target.value } : null
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateClass}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
