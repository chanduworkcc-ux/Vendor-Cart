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
import Register from "@/pages/register";
import VerifyEmail from "@/pages/verify-email";
import Pending from "@/pages/pending";
import Suspended from "@/pages/suspended";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/order-detail";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import Tickets from "@/pages/tickets";
import TicketDetail from "@/pages/ticket-detail";
import Referral from "@/pages/referral";
import WalletPage from "@/pages/wallet";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/verify-email" component={VerifyEmail} />

      <Route path="/pending">
        <ProtectedRoute requireApproved={false}>
          <Pending />
        </ProtectedRoute>
      </Route>

      <Route path="/suspended">
        <ProtectedRoute requireApproved={false}>
          <Suspended />
        </ProtectedRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/orders">
        <ProtectedRoute>
          <Layout>
            <Orders />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/orders/:id">
        <ProtectedRoute>
          <Layout>
            <OrderDetail />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/notifications">
        <ProtectedRoute>
          <Layout>
            <Notifications />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/profile">
        <ProtectedRoute>
          <Layout>
            <Profile />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/tickets">
        <ProtectedRoute>
          <Layout>
            <Tickets />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/tickets/:id">
        <ProtectedRoute>
          <Layout>
            <TicketDetail />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/referral">
        <ProtectedRoute>
          <Layout>
            <Referral />
          </Layout>
        </ProtectedRoute>
      </Route>

      <Route path="/wallet">
        <ProtectedRoute>
          <Layout>
            <WalletPage />
          </Layout>
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
