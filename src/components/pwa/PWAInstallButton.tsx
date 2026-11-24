import { useState } from 'react';
import { Download, PlusSquare, Share, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { AdaptiveSheet } from '../layout/AdaptiveSheet';
import { Button } from '../ui/Button';

interface PWAInstallButtonProps {
  compact?: boolean;
  fullWidth?: boolean;
}

export function PWAInstallButton({
  compact = false,
  fullWidth = false,
}: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <Button
        variant="secondary"
        fullWidth={fullWidth}
        onClick={() => void install()}
        aria-label="Instalar Mi Control Académico en este dispositivo"
        className={compact ? 'px-3 text-xs sm:text-sm' : undefined}
      >
        <Download className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
        <span>{compact ? 'Instalar' : 'Instalar aplicación'}</span>
      </Button>
    );
  }

  if (isIOS) {
    return (
      <>
        <Button
          variant="secondary"
          fullWidth={fullWidth}
          onClick={() => setShowIOSGuide(true)}
          aria-label="Ver instrucciones para instalar en iPhone o iPad"
          className={compact ? 'px-3 text-xs sm:text-sm' : undefined}
        >
          <Smartphone className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
          <span>{compact ? 'Instalar' : 'Instalar en iPhone / iPad'}</span>
        </Button>

        <AdaptiveSheet
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Instalar en pantalla de inicio"
          description="Agrega Mi Control Académico como aplicación independiente en Safari."
          footer={
            <Button fullWidth onClick={() => setShowIOSGuide(false)}>
              Entendido
            </Button>
          }
        >
          <ol className="space-y-4 text-sm text-slate-700">
            <li className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-mono font-semibold flex items-center justify-center shrink-0">
                1
              </span>
              <div className="pt-0.5 leading-relaxed">
                Toca el botón <strong className="text-slate-900">Compartir</strong>{' '}
                <Share className="inline w-4 h-4 text-blue-700 align-text-bottom" aria-hidden="true" />{' '}
                en la barra de herramientas de Safari.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-mono font-semibold flex items-center justify-center shrink-0">
                2
              </span>
              <div className="pt-0.5 leading-relaxed">
                Desplázate hacia abajo y selecciona{' '}
                <strong className="text-slate-900">Agregar a pantalla de inicio</strong>{' '}
                <PlusSquare className="inline w-4 h-4 text-slate-700 align-text-bottom" aria-hidden="true" />.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-mono font-semibold flex items-center justify-center shrink-0">
                3
              </span>
              <div className="pt-0.5 leading-relaxed">
                Confirma tocando <strong className="text-slate-900">Agregar</strong>. La aplicación se abrirá en modo independiente y funcionará sin conexión.
              </div>
            </li>
          </ol>
        </AdaptiveSheet>
      </>
    );
  }

  return null;
}
