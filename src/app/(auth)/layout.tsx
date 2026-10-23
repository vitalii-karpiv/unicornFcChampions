export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-3xl">🦄</div>
          <h1 className="mt-2 text-lg font-semibold tracking-tight">Unicorn FC Champions</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
