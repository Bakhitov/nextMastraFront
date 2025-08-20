import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-screen bg-neutral-50 text-neutral-900 overflow-hidden">
      <main className="h-full">
        {children}
      </main>
    </div>
  );
}


