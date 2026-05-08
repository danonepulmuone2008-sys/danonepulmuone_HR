import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "풀무원다논 HR",
  description: "HR 관리 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-200 min-h-screen flex justify-center">
        <div className="w-full max-w-[390px] min-h-screen bg-gray-50 relative overflow-x-hidden">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
