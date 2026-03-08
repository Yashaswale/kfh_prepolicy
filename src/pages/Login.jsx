import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../api";
import { setAuthData } from "../utils/auth";

const KFHLogo = () => (
  <div className="flex items-center gap-2">
    <img src="/KFH_logo.png" alt="KFH Logo" className="w-10 h-10" />
    <div>
      <div className="text-green-500 font-bold text-lg leading-none tracking-widest">KFH</div>
      <div className="text-green-500 text-xs tracking-widest">TAKAFUL</div>
    </div>
  </div>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          backgroundImage: "url('/login_img.png')",
          filter: "brightness(0.55) grayscale(0.3)",
        }}
      />

      {/* Logo top-left */}
      <div className="absolute top-5 left-5 z-10">
        <KFHLogo />
      </div>

      {/* Centered login card */}
      <div className="relative z-10 flex min-h-screen items-center justify-end pr-[10%]">
        <div className="bg-white rounded-sm shadow-2xl p-10 w-full max-w-md">
          <h1 className="text-center text-2xl font-bold text-gray-900 mb-8">
            Log In to Dashboard
          </h1>

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
            <input
              type="password"
              placeholder="enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
            />
          </div>

          <div className="flex items-center justify-between mb-7">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 accent-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>
            <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-green-600 transition">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              Forget password ?
            </button>
          </div>

          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded text-base transition"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}