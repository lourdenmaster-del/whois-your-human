import { redirect } from "next/navigation";

/** Public product root: IOC surface. */
export default function RootPage() {
  redirect("/ioc");
}
