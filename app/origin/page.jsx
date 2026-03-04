import BeautyLandingClient from "@/app/beauty/BeautyLandingClient";

const ORIGIN_VERSION = "v1";
const ORIGIN_COMMIT = process.env.NEXT_PUBLIC_ORIGIN_COMMIT ?? "?";

export default function Page() {
  return (
    <>
      {/* Health marker for debugging—not visible to users */}
      <div dangerouslySetInnerHTML={{ __html: `<!-- ORIGIN_LANDING: ${ORIGIN_VERSION} ${ORIGIN_COMMIT} -->` }} hidden aria-hidden />
      <BeautyLandingClient />
    </>
  );
}
