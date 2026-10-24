import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthShell } from '../components/AuthShell';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { useAuth } from '../hooks/useAuth';
import { safeRedirectPath } from '../lib/redirect';
import { loginSchema, validate } from '../lib/validation';
import { ApiError } from '../services/api-client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirect'));

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const result = validate(loginSchema, values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await login(result.data);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Sign-in failed. Please try again.');
      setSubmitting(false);
    }
  };

  const registerLink =
    redirectTo === '/' ? '/register' : `/register?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to purchase vehicles and manage your account."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => setValues({ ...values, email: event.target.value })}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => setValues({ ...values, password: event.target.value })}
          error={errors.password}
        />
        <Button type="submit" variant="dark" size="lg" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        New to Northlane?{' '}
        <Link to={registerLink} className="font-semibold text-ember-700 hover:text-ember-800">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
