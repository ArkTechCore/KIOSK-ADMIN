import "./globals.css";
import TopNav from "@/components/TopNav";

export const metadata = {
  title: "Kiosk Admin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Background accents */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-black/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-black/5 blur-3xl" />
        </div>

        <TopNav />

        <main className="mx-auto max-w-6xl px-4 py-6">
          {children}
          <div className="h-10" />
        </main>
      </body>
    </html>
  );
}
