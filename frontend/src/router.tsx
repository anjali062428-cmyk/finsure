import { createBrowserRouter } from 'react-router-dom';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { CustomerLayout } from './layouts/CustomerLayout';
import { AnalystLayout } from './layouts/AnalystLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { ConsoleLayout } from './layouts/ConsoleLayout';

// Guard components
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoleGuard } from './components/layout/RoleGuard';

// Console Command-Center Pages
import {
  ConsoleOverviewPage,
  ConsoleDetectionPage,
  ConsoleTransactionsPage,
  ConsoleAlertsPage,
  ConsoleInvestigationsPage,
  ConsoleNetworkPage,
  ConsoleReplayPage,
  ConsoleExplainabilityPage,
  ConsoleAnalyticsPage,
  ConsoleModelsPage,
  ConsoleSecurityPage,
} from './pages/console';

// Public Pages
import {
  LandingPage,
  LoginPage,
  SignupPage,
  VerifyOtpPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from './pages/public';

// Customer Pages
import {
  CustomerDashboardPage,
  CustomerTransactionsPage,
  CustomerTransactionDetailPage,
  CustomerSecurityPage,
  CustomerPayeesPage,
  CustomerReportsPage,
} from './pages/customer';

// Analyst Pages
import {
  AnalystDashboardPage,
  AnalystAlertsPage,
  AnalystIncidentDetailPage,
  AnalystCasesPage,
  AnalystCaseDetailPage,
  AnalystReplayPage,
  AnalystRingsPage,
  AnalystReportsPage,
} from './pages/analyst';

// Admin Pages
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminAnalystsPage,
  AdminModelsPage,
  AdminPoliciesPage,
  AdminAuditPage,
  AdminSystemPage,
} from './pages/admin';

// Document Pages
import {
  DocumentListPage,
  DocumentDetailPage,
} from './pages/documents';

// 404 Page
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  // Public Route Tree
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'signup', element: <SignupPage /> },
      { path: 'verify-otp', element: <VerifyOtpPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // Customer Route Tree
  {
    path: '/customer',
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={['customer', 'fraud_analyst', 'compliance_officer', 'admin']}>
          <CustomerLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <CustomerDashboardPage /> },
      { path: 'transactions', element: <CustomerTransactionsPage /> },
      { path: 'transactions/:id', element: <CustomerTransactionDetailPage /> },
      { path: 'payees', element: <CustomerPayeesPage /> },
      { path: 'security', element: <CustomerSecurityPage /> },
      { path: 'reports', element: <CustomerReportsPage /> },
      { path: 'documents', element: <DocumentListPage /> },
      { path: 'documents/:id', element: <DocumentDetailPage /> },
    ],
  },

  // Analyst Route Tree
  {
    path: '/analyst',
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={['fraud_analyst', 'compliance_officer', 'admin']}>
          <AnalystLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AnalystDashboardPage /> },
      { path: 'alerts', element: <AnalystAlertsPage /> },
      { path: 'incidents', element: <AnalystAlertsPage /> },
      { path: 'incidents/:id', element: <AnalystIncidentDetailPage /> },
      { path: 'cases', element: <AnalystCasesPage /> },
      { path: 'cases/:id', element: <AnalystCaseDetailPage /> },
      { path: 'rings', element: <AnalystRingsPage /> },
      { path: 'replay', element: <AnalystReplayPage /> },
      { path: 'reports', element: <AnalystReportsPage /> },
    ],
  },

  // Admin Route Tree
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={['admin']}>
          <AdminLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'analysts', element: <AdminAnalystsPage /> },
      { path: 'models', element: <AdminModelsPage /> },
      { path: 'policies', element: <AdminPoliciesPage /> },
      { path: 'audit', element: <AdminAuditPage /> },
      { path: 'system', element: <AdminSystemPage /> },
    ],
  },

  // Console Route Tree (Command Center)
  {
    path: '/console',
    element: (
      <ProtectedRoute>
        <RoleGuard allowedRoles={['fraud_analyst', 'compliance_officer', 'admin']}>
          <ConsoleLayout />
        </RoleGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <ConsoleOverviewPage /> },
      { path: 'detection', element: <ConsoleDetectionPage /> },
      { path: 'transactions', element: <ConsoleTransactionsPage /> },
      { path: 'alerts', element: <ConsoleAlertsPage /> },
      { path: 'investigations', element: <ConsoleInvestigationsPage /> },
      { path: 'network', element: <ConsoleNetworkPage /> },
      { path: 'replay', element: <ConsoleReplayPage /> },
      { path: 'explainability', element: <ConsoleExplainabilityPage /> },
      { path: 'analytics', element: <ConsoleAnalyticsPage /> },
      { path: 'models', element: <ConsoleModelsPage /> },
      { path: 'security', element: <ConsoleSecurityPage /> },
    ],
  },

  // Catch-all 404
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
