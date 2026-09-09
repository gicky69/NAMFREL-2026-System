import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function PendingVerification() {
    
    const handleLogout = async () => {
        try {
        await auth.signOut();
        } catch (error) {
        console.error("Error signing out:", error);
        }
    };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">
          Account Pending Verification
        </h1>

        <p className="mt-2 text-slate-500">
          Your account is currently awaiting administrator verification.
        </p>

        <button 
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
            Sign Out
        </button>
      </div>
    </div>
  );
}