export default function DashboardLoading() {
  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: '28px' }}>
        <div
          className="skeleton"
          style={{ width: '220px', height: '32px', borderRadius: '8px', marginBottom: '10px' }}
        />
        <div
          className="skeleton"
          style={{ width: '380px', height: '16px', borderRadius: '6px' }}
        />
      </div>

      {/* Metric / Action cards skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              height: '100px',
              borderRadius: '14px',
              background: 'var(--bg-surface)',
            }}
          />
        ))}
      </div>

      {/* Main content block skeleton */}
      <div
        className="skeleton"
        style={{
          width: '100%',
          height: '320px',
          borderRadius: '16px',
          background: 'var(--bg-surface)',
          marginBottom: '20px',
        }}
      />

      {/* Secondary list rows skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="skeleton"
            style={{
              width: '100%',
              height: '64px',
              borderRadius: '12px',
              background: 'var(--bg-surface)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
