import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#e0e0e0' }}>
      <h2>Page not found</h2>
      <p style={{ color: '#999', marginTop: '0.5rem' }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          marginTop: '1rem',
          padding: '0.5rem 1.5rem',
          background: '#2563eb',
          color: '#fff',
          borderRadius: '6px',
          textDecoration: 'none',
        }}
      >
        Go home
      </Link>
    </div>
  )
}
