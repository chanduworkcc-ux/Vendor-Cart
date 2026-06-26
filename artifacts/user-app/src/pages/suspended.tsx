import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldX, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function getTimeRemaining(until: string) {
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSecs = Math.floor(diff / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;
  return { days, hours, minutes, seconds, totalSecs };
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-red-950/60 border border-red-500/30 shadow-lg shadow-red-900/20" />
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            className="relative text-4xl font-bold tabular-nums text-red-100"
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {String(value).padStart(2, "0")}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-2 text-xs font-semibold uppercase tracking-widest text-red-400">{label}</span>
    </motion.div>
  );
}

export default function Suspended() {
  const { user, logout } = useAuth();
  const suspendedUntil = (user as any)?.suspendedUntil as string | null;
  const reason = (user as any)?.suspensionReason as string | null;
  const [remaining, setRemaining] = useState(() =>
    suspendedUntil ? getTimeRemaining(suspendedUntil) : null
  );

  useEffect(() => {
    if (!suspendedUntil) return;
    const id = setInterval(() => {
      const r = getTimeRemaining(suspendedUntil);
      setRemaining(r);
      if (!r) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [suspendedUntil]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-red-950/20 to-gray-950 p-4">
      {/* Animated background pulse */}
      <motion.div
        className="absolute inset-0 bg-red-600/5 rounded-full"
        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "center" }}
      />

      <motion.div
        className="relative z-10 max-w-lg w-full text-center space-y-8"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Icon */}
        <motion.div
          className="mx-auto w-24 h-24 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center shadow-xl shadow-red-900/30"
          animate={{ boxShadow: ["0 0 0 0 rgba(239,68,68,0.3)", "0 0 0 20px rgba(239,68,68,0)", "0 0 0 0 rgba(239,68,68,0.3)"] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <ShieldX className="w-12 h-12 text-red-500" />
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-red-400 tracking-tight">Account Suspended</h1>
          <p className="text-gray-400 text-sm">
            Hi <span className="text-gray-200 font-semibold">{user?.name}</span>, your account has been temporarily suspended.
          </p>
          {reason && (
            <p className="text-xs text-gray-500 italic bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-2 mt-2">
              Reason: {reason}
            </p>
          )}
        </div>

        {/* Countdown */}
        {remaining ? (
          <div className="space-y-4">
            <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Access restores in</p>
            <div className="flex items-start justify-center gap-4">
              <Digit value={remaining.days} label="Days" />
              <span className="text-3xl font-bold text-red-600/60 mt-4">:</span>
              <Digit value={remaining.hours} label="Hours" />
              <span className="text-3xl font-bold text-red-600/60 mt-4">:</span>
              <Digit value={remaining.minutes} label="Minutes" />
              <span className="text-3xl font-bold text-red-600/60 mt-4">:</span>
              <Digit value={remaining.seconds} label="Seconds" />
            </div>
            <p className="text-xs text-gray-600">
              Until {suspendedUntil ? new Date(suspendedUntil).toLocaleString() : "—"}
            </p>
          </div>
        ) : (
          <div className="py-4">
            <p className="text-green-400 font-semibold">Your suspension has ended. Please log in again.</p>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-red-900/30" />

        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            If you believe this is a mistake, please contact support after the suspension period ends.
          </p>
          <Button
            variant="outline"
            className="w-full border-red-900/50 text-red-400 hover:bg-red-950/40 hover:text-red-300"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
