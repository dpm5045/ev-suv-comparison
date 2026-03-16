'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#e0e0e0' }}>
      <h2>Something went wrong</h2>
      <p style={{ color: '#999', marginTop: '0.5rem' }}>
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1.5rem',
          background: '#2563eb',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  )
}
