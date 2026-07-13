import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api";
import { setAuthData } from "../utils/auth";
import { Eye, EyeOff } from "lucide-react";

const KFHLogo = () => (
  <img src="/KFH_logo.png" alt="KFH Logo" className="h-10 object-contain" />
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser({ email, password });
      if (data?.tokens && data?.user) {
        setAuthData({ tokens: data.tokens, user: data.user });
        if (!remember) {
          // If not remembering, keep tokens in this tab only by clearing on unload
          window.addEventListener("beforeunload", () => {
            sessionStorage.setItem("clearAuthOnReload", "1");
          });
        }
        navigate("/dashboard");
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      const msg =
        err?.data?.detail ||
        err?.data?.error ||
        "Unable to sign in. Please check your credentials.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-sans">
      {/* Background image overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/login_img.webp')",
          filter: "brightness(0.55) grayscale(0.3)",
        }}
      />

      {/* Logo top-left */}
      <div className="absolute top-5 left-5 z-10">
        <KFHLogo />
      </div>

      {/* Centered login card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 md:justify-end md:pr-[10%]">
        <div className="bg-white rounded-sm shadow-2xl p-6 sm:p-10 w-full max-w-md">
          <h1 className="text-center text-2xl font-bold text-gray-900 mb-8">
            Log In to Dashboard
          </h1>

          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="enter email id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
            />
          </div>

          {error && (
            <p className="mb-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded px-4 py-3 pr-12 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center mb-7">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 accent-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
          </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded text-base transition"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}