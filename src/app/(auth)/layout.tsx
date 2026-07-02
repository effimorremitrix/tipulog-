export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-primary-dark">טיפולוג</div>
          <div className="text-gray-500 mt-1">ניהול קליניקה למטפלים פרטיים</div>
        </div>
        {children}
      </div>
    </main>
  );
}
