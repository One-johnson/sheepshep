"use client";

import * as React from "react";

type AuthContextValue = {
  token: string | null;
  setToken: (token: string | null) => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialToken,
  children,
}: {
  initialToken: string | null;
  children: React.ReactNode;
}) {
  const [token, setToken] = React.useState<string | null>(initialToken);

  // Keep in sync if initialToken changes (e.g. server re-render with new cookie)
  React.useEffect(() => {
    setToken(initialToken);
  }, [initialToken]);

  const value = React.useMemo(
    () => ({ token, setToken }),
    [token]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
