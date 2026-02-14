"use client";

import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
      <footer className="border-t border-gray-100 py-4 text-center">
        <p className="text-xs text-muted-foreground">Powered by DocGen</p>
      </footer>
    </div>
  );
}
