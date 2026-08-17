import "./NotFound.css";

function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-card">
        <div className="not-found-number">404</div>

        <h1>Page Not Found</h1>

        <p>
          Sorry, the page you are looking for doesn't exist
          or may have been moved.
        </p>

        <a href="/dashboard" className="back-dashboard">
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}

export default NotFound;