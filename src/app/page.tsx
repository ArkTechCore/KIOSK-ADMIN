import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Kiosk Admin</h1>
        <p className="mt-1 text-gray-700">
          Stores + Menu management for your Flutter kiosk.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/login" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Login
          </Link>
          <Link href="/stores" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50">
            Stores
          </Link>
          <Link href="/catalog" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50">
            Menu
          </Link>
          <Link href="/reports" className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50">
            Reports
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold">How you set the menu</div>
        <ol className="mt-3 list-decimal pl-5 text-sm text-gray-700 space-y-1">
          <li>Login with admin email + password.</li>
          <li>Stores: make sure store QFC exists (or create it).</li>
          <li>Menu: click “Export from backend”, edit JSON (or upload a JSON file), then “Import to backend”.</li>
          <li>Your Flutter kiosk calls <span className="font-mono">/api/v1/stores/QFC/menu-v2</span> and shows the updated menu.</li>
        </ol>
      </div>
    </div>
  );
}
