import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="page-wrap">
      <article className="card">
        <h2>Page not found</h2>
        <p>The page you are looking for does not exist.</p>
        <Link className="primary-btn" to="/dashboard">Back to Dashboard</Link>
      </article>
    </section>
  )
}

export default NotFoundPage
