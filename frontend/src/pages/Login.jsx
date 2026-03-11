import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { loginUser, roleToRoute } from "../utils/auth";

// Login and role-based redirect.
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const user = await loginUser(email, password);

      if (!user) {
        toast.error("Invalid credentials");
        setLoading(false);
        return;
      }

      toast.success("Login successful");
      
      // Navigate based on user role
      const route = roleToRoute[user.role] || "/";
      navigate(route);
    } catch (error) {
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        <h1 className="mb-6 text-2xl font-bold text-slate-800 dark:text-slate-100">
          Login
        </h1>

        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Email
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 disabled:opacity-50"
        />

        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Password
        </label>
        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          className="mb-6 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          No account yet?{" "}
          <Link
            to="/create-account"
            className="font-semibold text-blue-600 dark:text-emerald-400"
          >
            Create Account
          </Link>
        </p>
        
        {/* Test credentials hint */}
        <div className="mt-6 rounded-lg bg-blue-50 p-3 dark:bg-slate-800">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
            Test Credentials:
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            admin@example.com / admin123
          </p>
        </div>
      </form>
    </div>
  );
}

export default Login;
