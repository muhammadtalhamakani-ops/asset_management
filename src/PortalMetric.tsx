export function PortalMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: string }) {
  return <article className={`portal-metric ${tone ?? ''}`}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>
}
