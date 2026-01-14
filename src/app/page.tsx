import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Kiosk Admin</h1>
      <p className="text-gray-700">Manage stores + bulk import catalog for the Flutter kiosk.</p>

      <div className="flex gap-2">
        <Link href="/login" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white">
          Login
        </Link>
        <Link href="/stores" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
          Stores
        </Link>
        <Link href="/catalog" className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">
          Catalog
        </Link>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="text-sm font-semibold">Simple workflow</div>
        <ol className="mt-2 list-decimal pl-5 text-sm text-gray-700 space-y-1">
          <li>Login</li>
          <li>Create store (QFC)</li>
          <li>Catalog → Reload → Edit JSON → Import</li>
          <li>Flutter kiosk reads /stores/QFC/menu-v2</li>
        </ol>
      </div>
    </div>
  );
}
