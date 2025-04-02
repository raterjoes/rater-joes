import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function AuthForm() {
  const { user, login, signup, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }

      setEmail("");
      setPassword("");
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      {/* Top-left home link */}
      <div className="absolute top-4 left-4">
        <Link
          to="/"
          className="text-blue-600 hover:underline font-medium"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="bg-white p-4 shadow rounded max-w-sm mx-auto mt-6">
        {user ? (
          <div className="text-center">
            <p className="mb-4">Welcome, {user.email}</p>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Log Out
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-center">
              {mode === "login" ? "Log In" : "Sign Up"}
            </h2>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <input
              type="email"
              placeholder="Email"
              className="w-full p-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {mode === "login" ? "Log In" : "Create Account"}
            </button>

            <p className="text-sm text-center">
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="text-blue-600 underline"
                onClick={() =>
                  setMode((prev) => (prev === "login" ? "signup" : "login"))
                }
              >
                {mode === "login" ? "Sign Up" : "Log In"}
              </button>
            </p>
          </form>
        )}
      </div>
    </>
  );
}
