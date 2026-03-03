import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { saveUser } from "../utils/auth";

// Account creation with role selection.
function CreateAccount() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "Admin",
  });

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    saveUser(formData);
    toast.success("Account Created Successfully");

    setTimeout(() => {
      navigate("/login");
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        <h1 className="mb-6 text-2xl font-bold text-slate-800 dark:text-slate-100">
          Create Account
        </h1>

        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Name
        </label>
        <input
          required
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
        />

        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Email
        </label>
        <input
          required
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
        />

        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Password
        </label>
        <input
          required
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="mb-4 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
        />

        <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
          Role
        </label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="mb-6 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
        >
          <option>Admin</option>
          <option>Warehouse Staff</option>
          <option>Delivery Person</option>
        </select>

        <button
          type="submit"
          className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 px-4 py-2 font-semibold text-white"
        >
          Create Account
        </button>

        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-600 dark:text-emerald-400"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default CreateAccount;
