import { Routes, Route } from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import MLDefense from "./dashboard/MLDefense";
import Upload from "./dashboard/Upload";
import Files from "./dashboard/Files";
import SharedWithMe from "./dashboard/SharedWithMe";
import MyFiles from "./dashboard/MyFiles";
import SignIn from "./auth/SignIn";
import SignUp from "./auth/SignUp";
import ProtectedRoute from "./app/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import SecurityPage from "./pages/SecurityPage";
import DashboardLayout from "./layouts/DashboardLayout";

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Protected Dashboard Pages */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ml-defense"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <MLDefense />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Upload />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/files"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <Files />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/shared-with-me"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SharedWithMe />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/my-files"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <MyFiles />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;