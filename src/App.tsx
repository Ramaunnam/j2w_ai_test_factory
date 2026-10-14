import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ThemeProvider } from '@/lib/theme'
import { RoleProvider } from '@/lib/role'
import { SelectionProvider } from '@/lib/selection'
import { ToastProvider } from '@/components/ui/toast'
import { AppShell } from '@/components/layout/AppShell'

import CommandCentrePage from '@/pages/CommandCentre'
import LandscapePage from '@/pages/Landscape'
import DiscoveryPage from '@/pages/Discovery'
import TestStudioPage from '@/pages/TestStudio'
import TestDataPage from '@/pages/TestData'
import RunCentrePage from '@/pages/RunCentre'
import InterfacesPage from '@/pages/Interfaces'
import RegressionPage from '@/pages/Regression'
import LoadTestPage from '@/pages/LoadTest'
import AccessSodPage from '@/pages/AccessSod'
import ReconciliationPage from '@/pages/Reconciliation'
import SelfHealingPage from '@/pages/SelfHealing'
import EvidencePage from '@/pages/Evidence'
import ReleasePage from '@/pages/Release'
import ApprovalsPage from '@/pages/Approvals'
import DeliveryPage from '@/pages/Delivery'
import CoveragePage from '@/pages/Coverage'
import RunSummary from '@/report/RunSummary'
import EvidencePack from '@/report/EvidencePack'
import FindingCard from '@/report/FindingCard'
import ReleaseReport from '@/report/ReleaseReport'

function AppRoutes() {
  const navigate = useNavigate()
  return (
    <RoleProvider onRoleChange={(role) => navigate(role.landingRoute)}>
      <Routes>
        {/* The four reporting outputs: standalone, print-ready, no app shell */}
        <Route path="/finding/:id" element={<FindingCard />} />
        <Route path="/report/:runId" element={<RunSummary />} />
        <Route path="/release-report/:releaseId" element={<ReleaseReport />} />
        <Route path="/evidence-pack/:runId" element={<EvidencePack />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<CommandCentrePage />} />
          <Route path="/landscape" element={<LandscapePage />} />
          <Route path="/discovery" element={<DiscoveryPage />} />
          <Route path="/studio" element={<TestStudioPage />} />
          <Route path="/test-data" element={<TestDataPage />} />
          <Route path="/run" element={<RunCentrePage />} />
          <Route path="/interfaces" element={<InterfacesPage />} />
          <Route path="/regression" element={<RegressionPage />} />
          <Route path="/load" element={<LoadTestPage />} />
          <Route path="/access-sod" element={<AccessSodPage />} />
          <Route path="/reconciliation" element={<ReconciliationPage />} />
          <Route path="/self-healing" element={<SelfHealingPage />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/release" element={<ReleasePage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/coverage" element={<CoveragePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </RoleProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <SelectionProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </SelectionProvider>
    </ThemeProvider>
  )
}
