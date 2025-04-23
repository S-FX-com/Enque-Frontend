"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface LogEntry {
  timestamp: string;
  level: "info" | "error" | "warn";
  message: string;
  details?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "info" | "error" | "warn">("all");

  useEffect(() => {
    const fetchLogs = () => {
      try {
        const storedLogs = localStorage.getItem('app_logs');
        if (storedLogs) {
          const parsedLogs: LogEntry[] = JSON.parse(storedLogs);
          setLogs(parsedLogs);
        }
      } catch (error) {
        console.error("Error fetching logs:", error);
      }
    };

    fetchLogs();

    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);

      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      addLog("error", message);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Add a log entry
  const addLog = (level: "info" | "error" | "warn", message: string, details?: string) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    };

    setLogs(prevLogs => {
      const updatedLogs = [newLog, ...prevLogs].slice(0, 100);

      try {
        localStorage.setItem('app_logs', JSON.stringify(updatedLogs));
      } catch (error) {
        console.error("Error saving logs:", error);
      }
      
      return updatedLogs;
    });
  };

  // Generate test logs for demonstration
  const generateTestLogs = () => {
    addLog("info", "User logged in", "User: test@example.com");
    addLog("warn", "API request slow", "Endpoint: /api/users - Response time: 3.5s");
    addLog("error", "Failed to load resource", "Status: 404, URL: https://api.example.com/resource");
    addLog("info", "Page navigation", "From: /home, To: /dashboard");
  };

  // Clear all logs
  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('app_logs');
  };

  const filteredLogs = filter === "all"
    ? logs
    : logs.filter(log => log.level === filter);

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Application Logs</h1>
          
          <div className="flex gap-2">
            <Button onClick={generateTestLogs} variant="outline">
              Generate Test Logs
            </Button>
            <Button onClick={clearLogs} variant="outline" className="text-red-600">
              Clear Logs
            </Button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "info" ? "default" : "outline"}
            onClick={() => setFilter("info")}
            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            Info
          </Button>
          <Button
            variant={filter === "warn" ? "default" : "outline"}
            onClick={() => setFilter("warn")}
            className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
          >
            Warning
          </Button>
          <Button
            variant={filter === "error" ? "default" : "outline"}
            onClick={() => setFilter("error")}
            className="bg-red-100 text-red-700 hover:bg-red-200"
          >
            Error
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No logs to display
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b text-left">
                <tr>
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Level</th>
                  <th className="p-3 font-medium">Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, index) => (
                  <tr 
                    key={index}
                    className="border-b last:border-0 hover:bg-slate-50"
                  >
                    <td className="p-3 text-sm whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium
                        ${log.level === 'info' ? 'bg-blue-100 text-blue-700' : 
                          log.level === 'warn' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-red-100 text-red-700'}`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="p-3">
                      <div>{log.message}</div>
                      {log.details && (
                        <div className="text-sm text-slate-500 mt-1">
                          {log.details}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
