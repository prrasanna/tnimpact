import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { loginUser, roleToRoute } from "../utils/auth";

// Login and role-based redirect.
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const user = loginUser(email, password);

    if (!user) {
      toast.error("Invalid credentials");
      return;
    }

    toast.success("Login successful");
    navigate(roleToRoute[user.role]);
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
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
        />

        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Password
        </label>
        <input
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-6 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 font-semibold text-white"
        >
          Login
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
      </form>
    </div>
  );
}

export default Login;
