'use client';
// Catches unexpected errors on any page and offers a retry (F1 error state).
export default function Error({ reset }) {
  return (
    <section className="centered">
      <div className="alert" role="alert">
        <p>Something went wrong.</p>
        <button type="button" className="button" onClick={() => reset()}>Try again</button>
      </div>
    </section>
  );
}
