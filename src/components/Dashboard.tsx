import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Plus, TrendingUp, DollarSign, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import ExpenseChart from "./ExpenseChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Profile {
  daily_limit: number;
  full_name: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchExpenses();
  }, []);

  useEffect(() => {
    calculateTodayTotal();
  }, [expenses]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } else {
      setProfile(data);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load expenses",
        variant: "destructive",
      });
    } else {
      setExpenses(data || []);
    }
    setLoading(false);
  };

  const calculateTodayTotal = () => {
    const today = new Date().toISOString().split("T")[0];
    const todayExpenses = expenses.filter((exp) => exp.date === today);
    const total = todayExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    setTodayTotal(total);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleExpenseAdded = () => {
    setShowExpenseForm(false);
    fetchExpenses();
  };

  const isOverLimit = profile && todayTotal > profile.daily_limit;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">Smart Expense Tracker</h1>
          </div>
          <div className="flex items-center gap-4">
            {profile && (
              <span className="text-sm text-muted-foreground">
                Welcome, {profile.full_name || "User"}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isOverLimit && (
          <Alert variant="destructive" className="mb-6 border-warning bg-warning/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Daily Limit Exceeded!</AlertTitle>
            <AlertDescription>
              You have exceeded your daily expense limit of ${profile?.daily_limit.toFixed(2)}. 
              Today's total: ${todayTotal.toFixed(2)}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Expenses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${todayTotal.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {expenses.filter((e) => e.date === new Date().toISOString().split("T")[0]).length} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Limit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">
                ${profile?.daily_limit.toFixed(2) || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Remaining: ${Math.max(0, (profile?.daily_limit || 0) - todayTotal).toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${expenses.reduce((sum, exp) => sum + Number(exp.amount), 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {expenses.length} total transactions
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Expense by Category</CardTitle>
              <CardDescription>Visual breakdown of your spending</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseChart expenses={expenses} />
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Quick Add</CardTitle>
              <CardDescription>Add a new expense</CardDescription>
            </CardHeader>
            <CardContent>
              {showExpenseForm ? (
                <ExpenseForm onSuccess={handleExpenseAdded} onCancel={() => setShowExpenseForm(false)} />
              ) : (
                <Button onClick={() => setShowExpenseForm(true)} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Expense
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>View and manage your expense history</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseList expenses={expenses} onUpdate={fetchExpenses} loading={loading} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
