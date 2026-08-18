# Shared UI primitives

This project has no shared component directory. Its reusable visual primitives are currently declared inline in `app/page.tsx`; they are page-local rather than exported library components.

## SectionHeading

- Source: `app/page.tsx`
- Description: Small kicker, section title, and optional action slot used throughout the dashboard.

```tsx
function SectionHeading({ kicker, title, action }: { kicker: string; title: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>{action}</div>;
}
```

## ActivityTable

- Source: `app/page.tsx`
- Description: Public-ledger activity table with commitment, type, time, and status.

```tsx
function ActivityTable({ rows, highlight }: { rows: typeof ACTIVITY_SEED; highlight?: string }) {
  return <div className="activity-panel"><div className="table-head"><span>PUBLIC COMMITMENT</span><span>TYPE</span><span>TIME</span><span>STATUS</span></div>{rows.map((item) => <div className={`activity-row ${item.commitment === highlight ? "highlight" : ""}`} key={`${item.commitment}-${item.time}`}><span className="commitment"><span className="commitment-dot" />{item.commitment}</span><span>{item.type}</span><span>{item.time}</span><span className={`table-status ${item.state.toLowerCase()}`}><i />{item.state}</span></div>)}</div>;
}
```

## PrivacyCard

- Source: `app/page.tsx`
- Description: Right-column explanation of the public/private data split and current contract state.
- Props: `onOpen`, `onCopy`, `copied`, `contractAddress`, `onDeploy`, `deploymentBusy`, `selectedNetwork`.

The full current implementation remains in `app/page.tsx` because it is tightly coupled to page wallet/deployment state.
