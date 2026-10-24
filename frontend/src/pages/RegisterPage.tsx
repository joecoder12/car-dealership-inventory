import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthShell } from '../components/AuthShell';
import { useToast } from '../components/toast/ToastProvider';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { useAuth } from '../hooks/useAuth';
import { safeRedirectPath } from '../lib/redirect';
import { PASSWORD_HINT, registerSchema, validate } from '../lib/validation';
import { ApiError } from '../services/api-client';

export function RegisterPage() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirect'));

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues({ ...values, [field]: event.target.value });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const result = validate(registerSchema, values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const user = await register(result.data);
      toast.success(`Welcome, ${user.name.split(' ')[0]}! Your account is ready.`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitting(false);
      if (error instanceof ApiError && error.code === 'EMAIL_ALREADY_REGISTERED') {
        setErrors({ email: error.message });
      } else if (error instanceof ApiError && error.details.length > 0) {
        setErrors(error.fieldErrors());
      } else {
        setFormError(
          error instanceof ApiError ? error.message : 'Registration failed. Please try again.',
        );
      }
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="It takes less than a minute. You can start buying right away."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert>{formError}</Alert>}
        <TextField
          label="Full name"
          autoComplete="name"
          value={values.name}
          onChange={update('name')}
          error={errors.name}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={update('email')}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={update('password')}
          error={errors.password}
          hint={PASSWORD_HINT}
        />
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-ember-700 hover:text-ember-800">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
