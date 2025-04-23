"use client";

import { useState, useEffect } from "react";
import { AppConfigs } from "@/configs";

interface ServiceStatus {
  name: string;
  status: "online" | "offline" | "checking";
  responseTime?: number;
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Frontend", status: "checking" },
    { name: "Backend API", status: "checking" },
  ]);

  useEffect(() => {
    const checkServices = async () => {
      setServices(prev =>
        prev.map(service =>
          service.name === "Frontend"
            ? { ...service, status: "online", responseTime: 0 }
            : service
        )
      );

      const startTime = performance.now();
      try {
        const response = await fetch(`${AppConfigs.api}/health`, { 
          method: 'GET',
          cache: 'no-store'
        });
        
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        if (response.ok) {
          setServices(prev => 
            prev.map(service => 
              service.name === "Backend API"
                ? { ...service, status: "online", responseTime }
                : service
            )
          );
        } else {
          setServices(prev => 
            prev.map(service => 
              service.name === "Backend API"
                ? { ...service, status: "offline", responseTime }
                : service
            )
          );
        }
      } catch (error) {
        console.error("Error checking API:", error);
        setServices(prev =>
          prev.map(service =>
            service.name === "Backend API"
              ? { ...service, status: "offline" }
              : service
          )
        );
      }
    };

    checkServices();

    const interval = setInterval(checkServices, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Health Status</h1>
        
        <div className="space-y-4">
          {services.map((service) => (
            <div 
              key={service.name}
              className="p-4 border rounded-lg flex items-center justify-between"
            >
              <div>
                <h2 className="font-medium">{service.name}</h2>
                {service.responseTime !== undefined && (
                  <p className="text-sm text-slate-500">
                    Response time: {service.responseTime}ms
                  </p>
                )}
              </div>
              
              <div className="flex items-center">
                {service.status === "checking" ? (
                  <div className="flex items-center">
                    <div className="animate-pulse h-3 w-3 bg-yellow-400 rounded-full mr-2"></div>
                    <span className="text-yellow-600">Checking...</span>
                  </div>
                ) : service.status === "online" ? (
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-600">Online</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-red-600">Offline</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-500 mt-6">
          Last checked: {new Date().toLocaleString()}
        </p>
      </div>
    </main>
  );
}
