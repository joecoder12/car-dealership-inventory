import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { AppLayout } from '../layouts/AppLayout';
import { CataloguePage } from '../pages/CataloguePage';
import { NotFoundPage } from '../pages/StatusPages';
import { VehicleDetailPage } from '../pages/VehicleDetailPage';
import { GuestOnly, RequireAdmin } from './guards';

// Shopping pages load eagerly; account and admin pages (and the form
// validation library they use) are split into chunks fetched on first visit.
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() =>
  import('../pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const AdminInventoryPage = lazy(() =>
  import('../pages/admin/AdminInventoryPage').then((m) => ({ default: m.AdminInventoryPage })),
);
const VehicleFormPage = lazy(() =>
  import('../pages/admin/VehicleFormPage').then((m) => ({ default: m.VehicleFormPage })),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<CataloguePage />} />
        <Route path="vehicles/:id" element={<VehicleDetailPage />} />
        <Route element={<GuestOnly />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
        <Route path="admin" element={<RequireAdmin />}>
          <Route index element={<AdminInventoryPage />} />
          <Route path="vehicles/new" element={<VehicleFormPage />} />
          <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
