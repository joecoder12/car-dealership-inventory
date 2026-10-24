import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useToast } from '../../components/toast/ToastProvider';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { buttonClasses, inputClasses } from '../../components/ui/styles';
import { FieldShell, TextField } from '../../components/ui/TextField';
import { VehicleArt } from '../../components/vehicles/VehicleArt';
import { useSaveVehicle } from '../../hooks/useInventoryMutations';
import { useVehicle } from '../../hooks/useVehicles';
import { categoryLabel, fuelLabel, vehicleName } from '../../lib/format';
import { validate } from '../../lib/validation';
import {
  emptyVehicleForm,
  newVehicleFormSchema,
  toFormValues,
  vehicleDetailsFormSchema,
  type VehicleFormValues,
} from '../../lib/vehicle-form';
import { ApiError } from '../../services/api-client';
import {
  FUEL_TYPES,
  VEHICLE_CATEGORIES,
  type Vehicle,
  type VehicleCategory,
} from '../../types/models';

function SelectField({
  label,
  value,
  onChange,
  error,
  hint,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ inputId, describedBy }) => (
        <select
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={inputClasses(Boolean(error))}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const isEdit = Boolean(vehicle);
  const navigate = useNavigate();
  const toast = useToast();
  const save = useSaveVehicle(vehicle?.id);

  const [values, setValues] = useState<VehicleFormValues>(
    vehicle ? toFormValues(vehicle) : emptyVehicleForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = (field: keyof VehicleFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const onInput = (field: keyof VehicleFormValues) => (event: { target: { value: string } }) =>
    set(field)(event.target.value);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const result = isEdit
      ? validate(vehicleDetailsFormSchema, values)
      : validate(newVehicleFormSchema, values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    save.mutate(result.data, {
      onSuccess: (saved) => {
        toast.success(`${vehicleName(saved)} was ${isEdit ? 'updated' : 'added'}.`);
        navigate('/admin');
      },
      onError: (error) => {
        if (error instanceof ApiError && error.details.length > 0) {
          setErrors(error.fieldErrors());
        } else {
          setFormError(error.message);
        }
      },
    });
  };

  const preview = {
    id: vehicle?.id ?? 'preview',
    make: values.make || 'New',
    model: values.model || 'vehicle',
    category: (VEHICLE_CATEGORIES as readonly string[]).includes(values.category)
      ? (values.category as VehicleCategory)
      : 'SEDAN',
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-8 rounded-3xl bg-white p-6 shadow-card ring-1 ring-ink-900/5 sm:p-8">
        {formError && <Alert>{formError}</Alert>}

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-sm font-semibold text-ink-900">Vehicle</legend>
          <TextField
            label="Make"
            value={values.make}
            onChange={onInput('make')}
            error={errors.make}
            autoComplete="off"
          />
          <TextField
            label="Model"
            value={values.model}
            onChange={onInput('model')}
            error={errors.model}
            autoComplete="off"
          />
          <SelectField
            label="Category"
            value={values.category}
            onChange={set('category')}
            error={errors.category}
          >
            <option value="">Choose…</option>
            {VEHICLE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Year"
            type="number"
            inputMode="numeric"
            value={values.year}
            onChange={onInput('year')}
            error={errors.year}
            hint="Optional"
          />
          <SelectField
            label="Fuel type"
            value={values.fuelType}
            onChange={set('fuelType')}
            error={errors.fuelType}
            hint="Optional"
          >
            <option value="">Not specified</option>
            {FUEL_TYPES.map((fuel) => (
              <option key={fuel} value={fuel}>
                {fuelLabel(fuel)}
              </option>
            ))}
          </SelectField>
        </fieldset>

        <fieldset className="grid gap-5 sm:grid-cols-2">
          <legend className="mb-4 text-sm font-semibold text-ink-900">Pricing & stock</legend>
          <TextField
            label="Price (USD)"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={values.price}
            onChange={onInput('price')}
            error={errors.price}
          />
          {isEdit ? (
            <div className="rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
              <p className="font-medium text-ink-900">{vehicle!.quantity} units in stock</p>
              <p className="mt-1 text-xs">
                Stock changes only through sales and the Restock action, so edits can never
                overwrite live inventory.
              </p>
            </div>
          ) : (
            <TextField
              label="Initial stock"
              type="number"
              inputMode="numeric"
              step="1"
              min="0"
              value={values.quantity}
              onChange={onInput('quantity')}
              error={errors.quantity}
            />
          )}
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="mb-4 text-sm font-semibold text-ink-900">Presentation</legend>
          <TextField
            label="Image URL"
            type="url"
            value={values.imageUrl}
            onChange={onInput('imageUrl')}
            error={errors.imageUrl}
            hint="Optional. Must start with https://. Without one, an illustration is shown."
            placeholder="https://"
          />
          <FieldShell
            label="Description"
            error={errors.description}
            hint="Optional, up to 2000 characters."
          >
            {({ inputId, describedBy }) => (
              <textarea
                id={inputId}
                rows={4}
                value={values.description}
                onChange={onInput('description')}
                aria-invalid={errors.description ? true : undefined}
                aria-describedby={describedBy}
                className={inputClasses(Boolean(errors.description))}
              />
            )}
          </FieldShell>
        </fieldset>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-ink-50 to-ink-100 p-4 ring-1 ring-ink-900/5">
          <VehicleArt vehicle={preview} className="w-full" />
          <p className="mt-2 text-center text-xs text-ink-500">Live preview</p>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={save.isPending}>
          {isEdit ? 'Save changes' : 'Add vehicle'}
        </Button>
        <Link to="/admin" className={`${buttonClasses('secondary', 'lg')} w-full`}>
          Cancel
        </Link>
      </aside>
    </form>
  );
}

export function VehicleFormPage() {
  const { id } = useParams();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/admin" className="text-sm font-medium text-ink-600 hover:text-ink-950">
        <span aria-hidden="true">←</span> Back to inventory
      </Link>
      {id ? <EditVehicle id={id} /> : <NewVehicle />}
    </div>
  );
}

function NewVehicle() {
  return (
    <>
      <h1 className="mt-4 mb-8 text-3xl font-semibold text-ink-950">Add a vehicle</h1>
      <VehicleForm />
    </>
  );
}

function EditVehicle({ id }: { id: string }) {
  const { data: vehicle, isPending, isError, error } = useVehicle(id);
  if (isPending) return <PageSpinner label="Loading vehicle" />;
  if (isError) {
    const missing = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold text-ink-950">
          {missing ? 'Vehicle not found' : 'We couldn’t load this vehicle'}
        </h1>
        <p className="mt-2 text-ink-500">{missing ? 'It may have been deleted.' : error.message}</p>
      </div>
    );
  }
  return (
    <>
      <h1 className="mt-4 mb-8 text-3xl font-semibold text-ink-950">Edit {vehicleName(vehicle)}</h1>
      {/* key: remount with fresh form state if a different vehicle is loaded */}
      <VehicleForm key={vehicle.id} vehicle={vehicle} />
    </>
  );
}
