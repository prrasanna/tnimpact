import { Link } from "react-router-dom";

// Fallback page for unknown routes.
function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <h1 className="mb-2 text-4xl font-bold text-slate-800 dark:text-slate-100">
          404
        </h1>
        <p className="mb-4 text-slate-600 dark:text-slate-300">
          Page not found
        </p>
        <Link
          to="/"
          className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 text-white"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
