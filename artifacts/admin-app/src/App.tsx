import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { WebSocketProvider } from "@/lib/websocket";
import { ProtectedRoute } from "@/components/protected-route";
import { Layout } from "@/components/layout";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import UserDetail from "@/pages/user-detail";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import Notifications from "@/pages/notifications";
import Settings from "@/pages/settings";
import Tickets from "@/pages/tickets";
import TicketDetail from "@/pages/ticket-detail";
import Analytics from "@/pages/analytics";
import ActivityLogs from "@/pages/activity-logs";
import Referrals from "@/pages/referrals";
import Withdrawals from "@/pages/withdrawals";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      <Route path="/">
        <ProtectedRoute>
          <Layout><Dashboard /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute>
          <Layout><Users /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/users/:id">
        <ProtectedRoute>
          <Layout><UserDetail /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/orders">
        <ProtectedRoute>
          <Layout><Orders /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/orders/:id">
        <ProtectedRoute>
          <Layout><OrderDetail /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/notifications">
        <ProtectedRoute>
          <Layout><Notifications /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/settings">
        <ProtectedRoute>
          <Layout><Settings /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/tickets">
        <ProtectedRoute>
          <Layout><Tickets /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/tickets/:id">
        <ProtectedRoute>
          <Layout><TicketDetail /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/analytics">
        <ProtectedRoute>
          <Layout><Analytics /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/activity-logs">
        <ProtectedRoute>
          <Layout><ActivityLogs /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/referrals">
        <ProtectedRoute>
          <Layout><Referrals /></Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/withdrawals">
        <ProtectedRoute>
          <Layout><Withdrawals /></Layout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <WebSocketProvider>
              <Router />
            </WebSocketProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
