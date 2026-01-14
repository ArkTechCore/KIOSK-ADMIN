import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata = {
  title: "Kiosk Admin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <TopNav />
          <main className="container">{children}</main>
        </div>
      </body>
    </html>
  );
}
