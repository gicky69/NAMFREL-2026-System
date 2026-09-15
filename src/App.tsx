
import { useState, useEffect, lazy, Suspense } from "react";
import {GoogleAuthProvider, signInWithPopup, onAuthStateChanged,} from "firebase/auth";

import { auth } from "@/lib/firebase";
import logo from "@/assets/web-logo.png";

// import dashboard components lazily to reduce initial bundle size
const AuthenticatedApp = lazy(
  () => import("@/components/AuthenticatedApp")
);

// import login component lazily to reduce initial bundle size
const Login = lazy(() => import("@/components/Login"));

type Profile = {
  email: string;
  full_name: string | null;
  role: string;
  is_verified: boolean;
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Public visitor / logged out
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to authenticate with backend"
          );
        }

        const data: Profile = await response.json();


        setProfile(data);

      } catch (error) {
        console.error("Authentication error:", error);

        /*
         * Do NOT block the public dashboard if backend
         * authentication fails.
         */
        setProfile(null);

      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");

    try {
      await signInWithPopup(
        auth,
        new GoogleAuthProvider()
      );

    } catch (error) {
      console.error("Google sign-in error:", error);

      setError(
        "Unable to sign in with Google. Please try again."
      );

      setLoading(false);
    }
  };

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50">

          <div className="mx-auto mb-4 w-full h-20 items-center justify-center">
					  <img src={logo} alt="SAIR Logo" className="h-full w-full object-contain" />
				  </div>

          <div className="mt-5 flex items-center gap-3 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />

            <span>
              Loading...
            </span>
          </div>

        </main>
      }
    >

    {showLogin ? (
      <Login
        onLogin={(profile) => {
          setProfile(profile);
          setShowLogin(false);
        }}
      />
    ) : (
      <AuthenticatedApp
        profile={profile}
        onLogout={() => {
          setProfile(null);
          setError("");
        }}
        onLogin={() => setShowLogin(true)}
      />
    )}

      
    </Suspense>
  );
}