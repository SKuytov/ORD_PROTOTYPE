import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./lib/auth";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import OrdersPage from "./pages/OrdersPage";
import NewOrderPage from "./pages/NewOrderPage";
import QuotesPage from "./pages/QuotesPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import SuppliersPage from "./pages/SuppliersPage";
import ProcurementPage from "./pages/ProcurementPage";
import AdminPage from "./pages/AdminPage";
import AnalyticsPage from "./pages/AnalyticsPage";

function ProtectedApp() {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!user) return <LoginPage />;
  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/new-order" component={NewOrderPage} />
        <Route path="/quotes" component={QuotesPage} />
        <Route path="/approvals" component={ApprovalsPage} />
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/procurement" component={ProcurementPage} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/analytics" component={AnalyticsPage} />
        <Route>
          <div className="p-8 text-muted-foreground">Page not found</div>
        </Route>
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router hook={useHashLocation}>
            <ProtectedApp />
          </Router>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
export default App;
