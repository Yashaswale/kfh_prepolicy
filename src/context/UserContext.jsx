import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getUser } from "../utils/auth";
import { ACCESS_ROLES, ALL_ACCESS_ROLES, getAccessConfig } from "../access/accessControl";

const DEMO_ROLE_KEY = "demo_access_role";

const UserContext = createContext(null);

function safeGetInitialRole() {
  const raw = sessionStorage.getItem(DEMO_ROLE_KEY) || localStorage.getItem(DEMO_ROLE_KEY);
  if (raw && ALL_ACCESS_ROLES.includes(raw)) return raw;
  return ACCESS_ROLES.SUPERVISOR;
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => getUser());
  const [demoRole, setDemoRole] = useState(() => safeGetInitialRole());

  // Keep user in sync if auth user changes (login/logout in another tab, etc.)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "authUser") setUser(getUser());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    // sessionStorage preferred so changing role is per-tab
    sessionStorage.setItem(DEMO_ROLE_KEY, demoRole);
  }, [demoRole]);

  const access = useMemo(() => getAccessConfig(demoRole), [demoRole]);

  const value = useMemo(
    () => ({
      user,
      setUser,
      demoRole,
      setDemoRole,
      access,
      roles: ALL_ACCESS_ROLES,
    }),
    [user, demoRole, access]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}