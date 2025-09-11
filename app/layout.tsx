import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import { RoleProvider } from "./components/role-context";
import { ModeProvider } from "./components/mode-context";
import { ScheduleProvider } from "./lib/schedule-store";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Barker Foresight App",
  description: "Production management for Barker Boatworks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} contrast-high`}>
        <RoleProvider>
          <ScheduleProvider>
            <ModeProvider>
              <Navbar />
              {children}
            </ModeProvider>
          </ScheduleProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
