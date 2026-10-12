import { redirect } from "next/navigation";
import { DEMO_ENABLED } from "@/features/demo/config";

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  if (!DEMO_ENABLED) redirect("/login");
  return children;
}
