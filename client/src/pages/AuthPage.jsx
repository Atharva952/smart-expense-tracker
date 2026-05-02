import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  clearAuthState,
  loginUser,
  registerUser,
  resendOtp,
  setPendingEmail,
  verifyOtp,
} from "../store/authSlice";

const AuthPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, message, requiresOtp, pendingEmail } = useSelector(
    (state) => state.auth,
  );
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [mode, setMode] = useState("login");
  const [otpMode, setOtpMode] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
  });

  useEffect(() => {
    if (requiresOtp) setOtpMode(true);
  }, [requiresOtp]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearAuthState());
    };
  }, [dispatch]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (otpMode) {
      const action = await dispatch(
        verifyOtp({ email: pendingEmail || form.email, otp: form.otp }),
      );
      if (action.meta.requestStatus === "fulfilled" && action.payload?.alreadyVerified) {
        setOtpMode(false);
        setMode("login");
      }
      return;
    }

    if (mode === "register") {
      dispatch(setPendingEmail(form.email));
      const action = await dispatch(
        registerUser({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      );
      if (action.meta.requestStatus === "fulfilled") {
        setOtpMode(true);
      }
      return;
    }

    dispatch(setPendingEmail(form.email));
    const action = await dispatch(
      loginUser({
        email: form.email,
        password: form.password,
      }),
    );
    if (action.meta.requestStatus === "rejected" && action.payload?.requiresOtpVerification) {
      setOtpMode(true);
    }
  };

  const resend = async () => {
    await dispatch(resendOtp({ email: pendingEmail || form.email }));
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--bg)] p-5">
      <div className="pointer-events-none absolute -left-16 top-0 h-72 w-72 rounded-full bg-[var(--glow-a)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-[var(--glow-b)] blur-3xl" />

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md rounded-3xl border border-[var(--line)] bg-white/90 p-7 shadow-lg backdrop-blur"
      >
        <h1 className="font-display text-3xl font-bold text-[var(--text)]">
          {otpMode ? "Verify OTP" : mode === "login" ? "Sign In" : "Create Account"}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {otpMode
            ? `Enter the code sent to ${pendingEmail || form.email}`
            : mode === "login"}
        </p>

        <div className="mt-6 space-y-3">
          {!otpMode && mode === "register" && (
            <input
              className="input"
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          )}

          {!otpMode && (
            <>
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </>
          )}

          {otpMode && (
            <input
              className="input tracking-[0.4em]"
              type="text"
              placeholder="Enter 6-digit OTP"
              value={form.otp}
              onChange={(e) => setForm({ ...form, otp: e.target.value })}
              maxLength={6}
              required
            />
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}

        <button className="btn-primary mt-5 w-full" disabled={loading} type="submit">
          {loading
            ? "Please wait..."
            : otpMode
              ? "Verify OTP"
              : mode === "login"
                ? "Login"
                : "Register"}
        </button>

        {otpMode ? (
          <button className="mt-3 w-full text-sm font-medium text-[var(--brand-deep)]" type="button" onClick={resend}>
            Resend OTP
          </button>
        ) : (
          <button
            className="mt-3 w-full text-sm font-medium text-[var(--brand-deep)]"
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create a new account" : "Already have an account?"}
          </button>
        )}
      </form>
    </div>
  );
};

export default AuthPage;
