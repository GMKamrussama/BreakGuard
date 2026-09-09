import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BreakGuard 🛡️ | Static AST Codebase Analyzer & Breaking Change Predictor",
  description: "Enterprise static AST codebase analyzer and SemVer breaking change predictor for Node.js dependencies with interactive dependency graph.",
  keywords: [
    "dependency-analyzer",
    "ast-parser",
    "swc",
    "breaking-changes",
    "package-json",
    "semver-checker",
    "nextjs",
    "react-flow",
    "developer-tools",
    "typescript"
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070b14] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
