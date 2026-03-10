import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Naretu Supermaket POS",
  description: "Modern Point of Sale System for Kenyan Supermarkets",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1a1a2e', color: '#fff', border: '1px solid #16213e' } }} />
      </body>
    </html>
  );
}
