import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "WaferMap AI | Wafer Analysis",
  description:
    "Configure wafer layouts, analyze yield and D0, and classify wafer-map defect signatures.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
