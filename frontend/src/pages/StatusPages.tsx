import { Link } from 'react-router';
import { buttonClasses } from '../components/ui/styles';

function StatusPage({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-ember-600 uppercase">{eyebrow}</p>
      <h1 className="mt-3 text-3xl font-semibold text-ink-950 sm:text-4xl">{title}</h1>
      <p className="mt-4 text-ink-500">{body}</p>
      <Link to="/" className={`${buttonClasses('dark')} mt-8`}>
        Back to the showroom
      </Link>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <StatusPage
      eyebrow="404"
      title="Wrong turn"
      body="We couldn’t find that page. It may have moved, or the vehicle may no longer be listed."
    />
  );
}

export function AccessDeniedPage() {
  return (
    <StatusPage
      eyebrow="403"
      title="Admins only"
      body="This area is for dealership administrators. Sign in with an admin account to continue."
    />
  );
}
