"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <button
        onClick={() => router.push("/camera")}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg"
      >
        服装診断を始める
      </button>
    </div>
  );
}
