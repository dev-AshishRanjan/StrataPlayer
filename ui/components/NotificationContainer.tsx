import React from "react";
import { PlayerState } from "../../core/StrataCore";
import {
  LoaderIcon,
  CheckIcon,
  AlertCircleIcon,
  DownloadIcon,
  CloseIcon,
} from "../Icons";

export const NotificationContainer = ({
  notifications,
}: {
  notifications: PlayerState["notifications"];
}) => {
  return (
    <div className="absolute top-4 left-4 z-[100] flex flex-col gap-2 pointer-events-none font-sans max-w-[85%] md:max-w-[280px]">
      {notifications.map((n) => {
        const isProgress = typeof n.progress === "number";

        return (
          <div
            key={n.id}
            className={`
                            relative overflow-hidden bg-zinc-950/80 backdrop-blur-xl border border-white/10 text-zinc-100 shadow-2xl rounded-lg pointer-events-auto
                            animate-in slide-in-from-left-4 fade-in duration-300
                            ${isProgress ? "w-64" : "w-auto max-w-full px-3 py-2.5"}
                        `}
            style={{ borderRadius: "var(--radius)" }}
          >
            {isProgress ? (
              <div className="p-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[var(--accent)] shrink-0">
                    <DownloadIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs font-bold text-white tracking-tight">
                        Downloading
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {n.progress}%
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate mb-2 leading-tight">
                      {n.message.replace(/Downloading\.\.\. \d+%/, "").trim() ||
                        "Processing..."}
                    </p>
                    <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] transition-all duration-300 ease-out"
                        style={{ width: `${n.progress}%` }}
                      />
                    </div>
                  </div>
                  {n.action && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        n.action?.onClick();
                      }}
                      className="text-zinc-500 hover:text-zinc-200 transition-colors p-1 -mt-1.5 -mr-1.5"
                      title={n.action.label}
                    >
                      <CloseIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                {n.type === "loading" && (
                  <LoaderIcon className="w-3.5 h-3.5 animate-spin text-[var(--accent)] shrink-0 mt-0.5" />
                )}
                {n.type === "success" && (
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                )}
                {n.type === "error" && (
                  <AlertCircleIcon className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                )}
                {n.type === "warning" && (
                  <AlertCircleIcon className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                )}
                {n.type === "info" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
                )}

                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-medium leading-snug break-words text-zinc-200">
                    {n.message}
                  </span>
                  {n.action && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        n.action?.onClick();
                      }}
                      className="mt-1 self-start text-[10px] font-bold text-[var(--accent)] hover:text-white transition-colors uppercase tracking-wider"
                    >
                      {n.action.label}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
