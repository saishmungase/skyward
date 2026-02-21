import { useState, useEffect } from "react";
import Landing from "./comp/Landing";
import Auth from "./comp/Auth";
import Dashboard from "./comp/Dash";
import HookPage from "./comp/HookPage";

export default function App() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);
  const [activeInstance, setActiveInstance] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("lp_token");
    const email = localStorage.getItem("lp_email");
    if (token && email) {
      setUser({ email, token });
      setPage("dashboard");
    }
  }, []);

  const handleAuth = (userData) => {
    setUser(userData);
    setPage("dashboard");
  };

  const handleOpenHook = (instance) => {
    setActiveInstance(instance);
    setPage("hook");
  };

  if (page === "landing")   return <Landing onNavigate={setPage} />;
  if (page === "auth")      return <Auth onNavigate={setPage} onAuth={handleAuth} />;
  if (page === "dashboard") return <Dashboard user={user} onNavigate={setPage} onOpenHook={handleOpenHook} />;
  if (page === "hook")      return <HookPage instance={activeInstance} onBack={() => setPage("dashboard")} />;

  return null;
}