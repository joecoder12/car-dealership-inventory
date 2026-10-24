import { Route, Routes } from 'react-router';
import { AppLayout } from '../layouts/AppLayout';
import { AdminInventoryPage } from '../pages/admin/AdminInventoryPage';
import { VehicleFormPage } from '../pages/admin/VehicleFormPage';
import { CataloguePage } from '../pages/CataloguePage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { NotFoundPage } from '../pages/StatusPages';
import { VehicleDetailPage } from '../pages/VehicleDetailPage';
import { GuestOnly, RequireAdmin } from './guards';

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
