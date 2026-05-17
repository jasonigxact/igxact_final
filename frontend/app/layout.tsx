import type { Metadata } from "next";
import "./globals.css";
import TransitionProvider from "../components/TransitionProvider";
import PageReset from "../components/PageReset";

export const metadata: Metadata = {
  title: "IGXact — Travel Dashboard",
  description: "Travel business analytics and trip management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <PageReset />
        <TransitionProvider>
          {children}
        </TransitionProvider>
      </body>
    </html>
  );
}
