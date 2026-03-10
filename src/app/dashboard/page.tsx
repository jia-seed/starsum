import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";

export default async function Dashboard() {
  const session = await auth();
  if (!session) redirect("/");

  return <DashboardClient />;
}
