import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "../(auth)/actions";

const NAV = [
  { href: "/dashboard", label: "לוח בקרה", icon: "📊" },
  { href: "/calendar", label: "יומן", icon: "📅" },
  { href: "/patients", label: "מטופלים", icon: "🗂️" },
  { href: "/payments", label: "תשלומים", icon: "💳" },
  { href: "/whatsapp", label: "וואטסאפ", icon: "💬" },
  { href: "/reports", label: "דוחות", icon: "📈" },
  { href: "/templates", label: "תבניות סיכום", icon: "📝" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div className="flex-1 flex">
      <aside className="no-print w-60 shrink-0 bg-[#0f2e33] text-white flex flex-col min-h-screen">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-xl font-bold">טיפולוג</div>
          <div className="text-xs text-white/60 mt-1">
            {user.clinicName || user.name}
          </div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-5 py-2.5 text-sm text-white/85 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-sm">
          <div className="text-white/85 mb-2">{user.name}</div>
          <form action={logout}>
            <button className="text-white/60 hover:text-white text-xs underline">
              התנתקות
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
    </div>
  );
}
