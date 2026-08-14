import { auth, currentUser } from "@clerk/nextjs/server";
import { getMe, type Me } from "@/lib/api";

type Role = Me["role"];
const VALID_ROLES: readonly Role[] = [
  "ADMIN",
  "MANAGER",
  "ENGINEER",
  "TECH",
  "VIEWER",
];

function normalizeRole(value: unknown): Role {
  return VALID_ROLES.includes(value as Role) ? (value as Role) : "VIEWER";
}

export default async function TodayPage() {
  const user = await currentUser();
  const { getToken } = await auth();

  const name =
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress ??
    "there";
  const role = normalizeRole(user?.publicMetadata?.role);

  // Prove the web -> api round-trip through the Clerk-verified middleware.
  let apiResult: Me | { error: string };
  try {
    const token = await getToken();
    apiResult = await getMe(token);
  } catch (err) {
    apiResult = { error: err instanceof Error ? err.message : "unknown error" };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
        <p className="text-muted-foreground">
          Your role is <span className="font-medium">{role}</span>.
        </p>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
          API round-trip — GET /me
        </h2>
        <pre className="overflow-x-auto text-sm">
          {JSON.stringify(apiResult, null, 2)}
        </pre>
      </section>
    </div>
  );
}
