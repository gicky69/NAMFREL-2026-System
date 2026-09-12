import { useState, useEffect, lazy, Suspense } from "react";
import logo from "@/assets/apc-logo.png";

import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "firebase/auth";

import { auth } from "@/lib/firebase";

const AuthenticatedApp = lazy(
  () => import("@/components/AuthenticatedApp")
);

const PendingVerification = lazy(
  () => import("@/components/UserVerification")
);


type Profile = {
  email: string;
  full_name: string | null;
  role: string;
  is_verified: boolean;
};


export default function App() {
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState<Profile | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      // No logged-in user
      if (!user) {
        setProfile(null);
        setAuthLoading(false);
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
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!response.ok) {
          throw new Error("Failed to authenticate with backend");
        }

        const data = await response.json();

        setProfile(data);

      } catch (error) {
        console.error("Authentication error:", error);
        setProfile(null);

      } finally {
        setAuthLoading(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);


  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");

    try {
      // Only sign in with Google
      // onAuthStateChanged will handle the backend request
      await signInWithPopup(
        auth,
        new GoogleAuthProvider()
      );

    } catch (error) {
      console.error(error);

      setError(
        "Unable to sign in with Google. Please try again."
      );

      setLoading(false);
    }
  };


  // Only show authenticated pages once profile is available
  if (profile) {

		if (profile?.is_verified) {
		return (
			<Suspense
				fallback={
					<main className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
					
					<img
						src={logo}
						alt="APC Logo"
						className="h-16 w-16 object-contain animate-pulse"
					/>

					<div className="mt-5 flex items-center gap-3 text-sm text-slate-400">
						<span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
						<span>Loading dashboard...</span>
					</div>

					</main>
				}
				>
				<AuthenticatedApp
					profile={profile}
					onLogout={() => setProfile(null)}
				/>
			</Suspense>
		);
	}

    return <PendingVerification />;
  }


  // LOGIN PAGE SHOWS IMMEDIATELY
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">

      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">

        <div className="mx-auto mb-4 w-12 h-12">
          <img
            src={logo}
            alt="Logo"
            className="w-12 h-12"
          />
        </div>

        <p className="text-md font-bold uppercase tracking-[0.2em] text-primary">
          NAMFREL 2026
        </p>

        <p className="text-xs uppercase tracking-[0.2em] text-primary">
          Incident Reporting & Sentiment Analysis
        </p>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Sign in with your Gmail account to continue to the dashboard.
        </p>


        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >

          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          ) : (
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path fill="#4285F4" d="M21.35 12.23c0-.74-.07-1.45-.2-2.13H12v4.03h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.29Z" />
              <path fill="#34A853" d="M12 21.99c2.63 0 4.84-.87 6.45-2.47l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.99Z" />
              <path fill="#FBBC05" d="M6.53 13.96a5.86 5.86 0 0 1 0-3.72V7.71H3.28a9.97 9.97 0 0 0 0 8.78l3.25-2.53Z" />
              <path fill="#EA4335" d="M12 6.21c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.28 14.63 2.25 12 2.25a9.74 9.74 0 0 0-8.72 5.46l3.25 2.53C7.3 7.93 9.46 6.21 12 6.21Z" />
            </svg>
          )}

          {loading ? "Signing in..." : "Continue with Google"}

        </button>

        {error && (
          <p className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}

        <p className="mt-8 text-xs text-slate-400">
          Access is limited to authorized Gmail accounts.
        </p>

      </section>
    </main>
  );
}