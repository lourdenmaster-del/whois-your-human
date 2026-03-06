/* APPROVED LANDING — Terminal intake experience. */
import OriginTerminalIntake from "@/components/OriginTerminalIntake";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <template dangerouslySetInnerHTML={{ __html: "<!-- ORIGIN_LANDING: terminal-v1 -->" }} />
      <OriginTerminalIntake />
    </>
  );
}
