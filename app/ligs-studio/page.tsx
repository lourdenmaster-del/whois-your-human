import type { Metadata } from "next";
import LigsStudio from "@/components/LigsStudio";

export const metadata: Metadata = {
  title: "LIGS Studio | Internal",
  description: "Internal LIGS Studio – run full vertical slice, preview background and composed marketing cards.",
};

export default function LigsStudioPage() {
  return <LigsStudio />;
}
