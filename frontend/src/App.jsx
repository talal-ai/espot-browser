import React from "react";
import "./App.css";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BrowserProvider } from "./contexts/BrowserContext";
import MainLayout from "./components/layout/MainLayout";
import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/common/ErrorBoundary";
import BrowserShell from "./components/browser/BrowserShell";
import UpdateNotification from "./components/UpdateNotification";

// Pages
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminProxies from "./pages/admin/Proxies";
import AdminSessions from "./pages/admin/Sessions";
import AdminCredentials from "./pages/admin/Credentials";
import AdminServices from "./pages/admin/Services";
import AdminGroups from "./pages/admin/Groups";
import AdminSettings from "./pages/admin/Settings";
import AdminConversations from "./pages/admin/Conversations";
import AdminFingerprints from "./pages/admin/FingerprintsManager";
import UserDashboard from "./pages/user/Dashboard";
import UserServices from "./pages/user/Services";
import UserSettings from "./pages/user/Settings";
import UserProfile from "./pages/user/Profile";
import UserActivity from "./pages/user/Activity";
import UserConversations from "./pages/user/Conversations";
import AuthCallback from "./pages/AuthCallback";

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  if (roles && user?.role && !roles.includes(user.role)) {
    return <Navigate to="/user" replace />;
  }

  return children;
};

const RoleHome = () => {
  const { user } = useAuth();
  if (user && user.role && user.role !== 'admin') {
    return <Navigate to="/user" replace />;
  }
  return <Navigate to="/admin" replace />;
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserProvider>
            <div className="App">
              <Router>
                <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Root Route - Redirects based on role */}
                <Route path="/" element={<ProtectedRoute><MainLayout><RoleHome /></MainLayout></ProtectedRoute>} />

                {/* Admin Routes - Wrapped in BrowserShell */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <BrowserShell>
                        <MainLayout>
                          <Routes>
                            <Route index element={<AdminDashboard />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="proxies" element={<AdminProxies />} />
                            <Route path="sessions" element={<AdminSessions />} />
                            <Route path="credentials" element={<AdminCredentials />} />
                            <Route path="services" element={<AdminServices />} />
                            <Route path="groups" element={<AdminGroups />} />
                            <Route path="settings" element={<AdminSettings />} />
                            <Route path="conversations" element={<AdminConversations />} />
                            <Route path="fingerprints" element={<AdminFingerprints />} />
                          </Routes>
                        </MainLayout>
                      </BrowserShell>
                    </ProtectedRoute>
                  }
                />

                {/* User Routes - Wrapped in BrowserShell */}
                <Route
                  path="/user/*"
                  element={
                    <ProtectedRoute>
                      <BrowserShell>
                        <MainLayout>
                          <Routes>
                            <Route index element={<UserDashboard />} />
                            <Route path="services" element={<UserServices />} />
                            <Route path="conversations" element={<UserConversations />} />
                            <Route path="settings" element={<UserSettings />} />
                            <Route path="profile" element={<UserProfile />} />
                            <Route path="activity" element={<UserActivity />} />
                          </Routes>
                        </MainLayout>
                      </BrowserShell>
                    </ProtectedRoute>
                  }
                />
                </Routes>
              </Router>
              <Toaster />
              <UpdateNotification />
            </div>
          </BrowserProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
