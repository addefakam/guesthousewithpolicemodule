'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useAppStore, type Page } from '@/lib/store';

const loadingFallback = (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const pageComponents: Record<Page, React.ComponentType> = {
  dashboard: dynamic(() => import('./pages/dashboard-page'), { loading: () => loadingFallback }),
  rooms: dynamic(() => import('./pages/rooms-page'), { loading: () => loadingFallback }),
  guests: dynamic(() => import('./pages/guests-page'), { loading: () => loadingFallback }),
  reservations: dynamic(() => import('./pages/reservations-page'), { loading: () => loadingFallback }),
  daytime: dynamic(() => import('./pages/daytime-page'), { loading: () => loadingFallback }),
  expenses: dynamic(() => import('./pages/expenses-page'), { loading: () => loadingFallback }),
  resources: dynamic(() => import('./pages/resources-page'), { loading: () => loadingFallback }),
  reports: dynamic(() => import('./pages/reports-page'), { loading: () => loadingFallback }),
  housekeeping: dynamic(() => import('./pages/housekeeping-page'), { loading: () => loadingFallback }),
  users: dynamic(() => import('./pages/users-page'), { loading: () => loadingFallback }),
  notifications: dynamic(() => import('./pages/notifications-page'), { loading: () => loadingFallback }),
  settings: dynamic(() => import('./pages/settings-page'), { loading: () => loadingFallback }),
  providers: dynamic(() => import('./pages/providers-page'), { loading: () => loadingFallback }),
  'police-guests': dynamic(() => import('./pages/police-guests-page'), { loading: () => loadingFallback }),
  'police-dashboard': dynamic(() => import('./pages/police-dashboard-page'), { loading: () => loadingFallback }),
};

export default function PageRenderer() {
  const { currentPage } = useAppStore();
  const PageComponent = pageComponents[currentPage];
  return <PageComponent />;
}