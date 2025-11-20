import type { Metadata } from "next";
import AntdProvider from "@/components/AntdProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dakard App",
  description: "Application Next.js avec Ant Design et Prisma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <AntdProvider>
          {children}
        </AntdProvider>
      </body>
    </html>
  );
}

