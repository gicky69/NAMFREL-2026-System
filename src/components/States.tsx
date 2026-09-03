import { Loader2 } from "lucide-react";

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
        <span className="text-red-600 text-xl">!</span>
      </div>
      <p className="text-slate-700 font-medium mb-1">Something went wrong</p>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="card p-12 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-slate-400 text-2xl">○</span>
      </div>
      <p className="text-slate-700 font-medium mb-1">{title}</p>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{message}</p>
    </div>
  );
}
