import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center gap-2.5 rounded-xl bg-amber-600 px-3.5 py-2.5 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>Sin conexión — trabajando con datos locales guardados</span>
    </div>
  );
}
