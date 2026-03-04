/* APPROVED LANDING — DO NOT MODIFY WITHOUT EXPLICIT APPROVAL. */
import BeautyLandingClient from "@/app/beauty/BeautyLandingClient";
import { getExemplarManifestsServer } from "@/lib/exemplar-store";

export const dynamic = "force-dynamic";

export default async function Page() {
  let manifests = [];
  try {
    const data = await getExemplarManifestsServer("v1");
    manifests = data.manifests ?? [];
  } catch {
    // Fallback when Blob unavailable (build time, no token, etc.)
  }
  return (
    <>
      <template dangerouslySetInnerHTML={{ __html: "<!-- ORIGIN_LANDING: v1 53ec531 -->" }} />
      <BeautyLandingClient initialManifests={manifests} />
    </>
  );
}
