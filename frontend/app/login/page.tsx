import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Skeleton className="h-80 w-full max-w-sm" />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
