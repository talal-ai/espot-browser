import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import MainLayout from "./components/layout/MainLayout";
import { Toaster } from "./components/ui/toaster";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Pages
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Proxies from "./pages/Proxies";
import Sessions from "./pages/Sessions";
import Credentials from "./pages/Credentials";
import Services from "./pages/Services";
import Diagnostics from "./pages/Diagnostics";
import Settings from "./pages/Settings";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="App">
          <BrowserRouter>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/users" element={<Users />} />
                <Route path="/proxies" element={<Proxies />} />
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/credentials" element={<Credentials />} />
                <Route path="/services" element={<Services />} />
                <Route path="/diagnostics" element={<Diagnostics />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainLayout>
          </BrowserRouter>
          <Toaster />
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
