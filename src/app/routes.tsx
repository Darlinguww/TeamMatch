import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Profile } from "./components/Profile";
import { Projects } from "./components/Projects";
import { ProjectDetails } from "./components/ProjectDetails";
import { MyTeams } from "./components/MyTeams";
import { Feedback } from "./components/Feedback";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { useAuth } from "./lib/authContext";
import { JSX } from "react";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isNewUser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isNewUser) return <Navigate to="/onboarding" replace />;
  return children;
}

function RequireGuest({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

function RequireNewUser({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isNewUser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isNewUser) return <Navigate to="/" replace />;
  return children;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <RequireGuest><Login /></RequireGuest>,
  },
  {
    path: "/register",
    element: <RequireGuest><Register /></RequireGuest>,
  },
  {
    path: "/onboarding",
    element: <RequireNewUser><OnboardingWizard /></RequireNewUser>,
  },
  {
    path: "/",
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, Component: Dashboard },
      { path: "profile", Component: Profile },
      { path: "projects", Component: Projects },
      { path: "projects/:id", Component: ProjectDetails },
      { path: "my-teams", Component: MyTeams },
      { path: "feedback", Component: Feedback },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);