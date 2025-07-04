import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { Eye, EyeOff } from "lucide-react";

// Function to convert Firebase error codes to user-friendly messages
const getErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address. Please check your email or sign up for a new account.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in instead.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/operation-not-allowed':
      return 'This operation is not allowed. Please contact support.';
    case 'auth/requires-recent-login':
      return 'For security reasons, please log in again.';
    default:
      return 'An error occurred. Please try again.';
  }
};

export default function AuthForm() {
  const { user, login, signup, logout, resetPassword, sendVerificationEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "signup") {
        await signup(email, password);

        // ✅ Save nickname to Firestore under /users/{uid}
        const currentUser = auth.currentUser;
        await setDoc(doc(db, "users", currentUser.uid), {
          email,
          nickname: nickname || null,
          createdAt: serverTimestamp(),
        });

        // Send verification email in the background
        sendVerificationEmail();
        setEmail("");
        setPassword("");
        setNickname("");
        navigate("/");
        return;
      } else if (mode === "reset") {
        await resetPassword(email);
        setSuccess("Password reset email sent! Check your inbox.");
        setEmail("");
        return;
      }

      setEmail("");
      setPassword("");
      setNickname("");
      navigate("/");
    } catch (err) {
      // Debug log to help diagnose error codes
      console.log('Firebase error:', err.code, err.message);
      let userFriendlyMessage = getErrorMessage(err.code);
      // Fallback if the error code is not recognized
      if (!userFriendlyMessage || userFriendlyMessage === 'An error occurred. Please try again.') {
        if (err.message && err.message.includes('email-already-in-use')) {
          userFriendlyMessage = 'An account with this email already exists. Please log in instead.';
        } else {
          userFriendlyMessage = 'An error occurred. Please try again.';
        }
      }
      setError(userFriendlyMessage);
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setIsVerifying(false);
    setShowPassword(false);
    setEmail("");
    setPassword("");
    setNickname("");
  };

  const handleResendVerification = async () => {
    try {
      await sendVerificationEmail();
      setSuccess("Verification email sent again! Check your inbox.");
    } catch (err) {
      const userFriendlyMessage = getErrorMessage(err.code);
      setError(userFriendlyMessage);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow">
        <div className="bg-white p-4 shadow rounded max-w-sm mx-auto mt-6">
          {user && user.emailVerified ? (
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
                {mode === "login" ? "Log In" : mode === "signup" ? "Sign Up" : "Reset Password"}
              </h2>

              {error && <p className="text-red-600 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}

              <input
                type="email"
                placeholder="Email"
                className="w-full p-2 border rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {mode !== "reset" && (
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="w-full p-2 pr-10 border rounded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
              )}

              {mode === "signup" && (
                <input
                  type="text"
                  placeholder="Nickname / Username"
                  className="w-full p-2 border rounded"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                />
              )}

              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                {mode === "login" ? "Log In" : mode === "signup" ? "Create Account" : "Send Reset Email"}
              </button>

              {mode === "login" && (
                <p className="text-sm text-center">
                  <button
                    type="button"
                    className="text-blue-600 underline"
                    onClick={() => handleModeChange("reset")}
                  >
                    Forgot Password?
                  </button>
                </p>
              )}

              <p className="text-sm text-center">
                {mode === "login" ? (
                  <>
                    New here?{" "}
                    <button
                      type="button"
                      className="text-blue-600 underline"
                      onClick={() => handleModeChange("signup")}
                    >
                      Sign Up
                    </button>
                  </>
                ) : mode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-blue-600 underline"
                      onClick={() => handleModeChange("login")}
                    >
                      Log In
                    </button>
                  </>
                ) : (
                  <>
                    Remember your password?{" "}
                    <button
                      type="button"
                      className="text-blue-600 underline"
                      onClick={() => handleModeChange("login")}
                    >
                      Log In
                    </button>
                  </>
                )}
              </p>

              {mode === "signup" && (
                <p className="text-sm text-center mt-2">
                  <button
                    type="button"
                    className="text-blue-600 underline"
                    onClick={() => handleModeChange("reset")}
                  >
                    Forgot Password?
                  </button>
                </p>
              )}
            </form>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
