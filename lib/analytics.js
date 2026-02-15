export function track(event, reportId) {
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, reportId }),
  }).catch(() => {});
}
