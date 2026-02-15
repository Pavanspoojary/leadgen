import React, { useEffect, useState } from "react";

interface AgentStatusProps {
  status: "idle" | "searching" | "analyzing" | "complete";
}

const AgentStatus: React.FC<AgentStatusProps> = ({ status }) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (status === "searching" || status === "analyzing") {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 400);
      return () => clearInterval(interval);
    } else {
      setDots("");
    }
  }, [status]);

  const prefix = "›"; // safer than ">"

  return (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-lg">
      <div className="text-sm font-mono space-y-2">

        {status === "searching" && (
          <div className="text-blue-400 animate-pulse">
            {prefix} Connecting to global search nodes{dots}
          </div>
        )}

        {status === "analyzing" && (
          <div className="text-purple-400 animate-pulse">
            {prefix} Analyzing website structures and SEO metadata{dots}
          </div>
        )}

        {status === "complete" && (
          <div className="text-green-500">
            {prefix}{prefix} System Initialized.
          </div>
        )}

        {status === "idle" && (
          <div className="text-gray-400">
            {prefix} Awaiting command...
          </div>
        )}

      </div>
    </div>
  );
};

export default AgentStatus;
