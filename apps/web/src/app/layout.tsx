import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistrar } from "@/components/service-worker-registrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Fay — PM Platform",
  description: "Internal preventive maintenance platform for The Fay.",
  appleWebApp: { capable: true, title: "The Fay PM", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">
      <html lang="en">
        <body className="min-h-screen bg-background text-foreground antialiased">
          <ServiceWorkerRegistrar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
