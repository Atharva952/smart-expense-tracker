import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  LayoutDashboard,
  WalletCards,
  ReceiptIndianRupee,
  LogOut,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import clsx from "clsx";
import { logoutUser } from "../store/authSlice";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/transactions", label: "Transactions", icon: ReceiptIndianRupee },
  { to: "/budgets", label: "Budgets", icon: WalletCards },
];

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSidebarOpen) {
      document.body.style.overflow = "";
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSidebarOpen]);

  const onLogout = async () => {
    setIsSidebarOpen(false);
    await dispatch(logoutUser());
    navigate("/auth");
  };

  const linkClassName = ({ isActive }) =>
    clsx(
      "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all",
      isActive
        ? "bg-[var(--brand)] text-white shadow-[0_8px_22px_var(--glow-a)]"
        : "text-[var(--muted)] hover:bg-[var(--soft)] hover:text-[var(--text)]",
    );

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--line)] bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            className="grid size-9 place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)]"
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>
          <div>
            <p className="text-sm text-[var(--muted)]">Welcome</p>
            <h1 className="font-display text-xl font-bold">
              {user?.name || "Expense Tracker"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            className="relative rounded-full border border-[var(--line)] p-2 text-[var(--muted)] transition hover:text-[var(--text)]"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-1 block size-1.5 rounded-full bg-red-500" />
          </button>
          <div className="grid size-9 place-items-center rounded-full bg-[var(--soft)] font-semibold text-[var(--brand-deep)]">
            {user?.name?.slice(0, 1)?.toUpperCase() || "U"}
          </div>
        </div>
      </header>

      <main className="px-4 py-4 sm:px-6">{children}</main>

      <div
        className={clsx(
          "fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200",
          isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[88vw] border-r border-[var(--line)] bg-white shadow-xl transition-transform duration-200",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!isSidebarOpen}
      >
        <div className="flex h-full flex-col p-5">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="font-display text-lg font-bold">Expense Tracker</p>
            </div>
            <button
              className="grid size-9 place-items-center rounded-lg border border-[var(--line)] text-[var(--muted)] transition hover:bg-[var(--soft)] hover:text-[var(--text)]"
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1.5">
            {links.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClassName}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-[var(--line)] pt-4">
            <button
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
              type="button"
              onClick={onLogout}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AppLayout;
