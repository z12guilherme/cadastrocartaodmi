import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './ui/button';
import { X } from 'lucide-react';

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-white rounded-lg shadow-lg border border-gray-200 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {offlineReady ? 'Aplicativo pronto' : 'Nova versão disponível'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {offlineReady
              ? 'O aplicativo pode ser usado offline.'
              : 'Uma nova versão está disponível. Clique em atualizar para carregar.'}
          </p>
        </div>
        <button onClick={close} className="text-gray-400 hover:text-gray-500">
          <X className="w-4 h-4" />
        </button>
      </div>
      {needRefresh && (
        <div className="mt-3">
          <Button size="sm" onClick={() => updateServiceWorker(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            Atualizar agora
          </Button>
        </div>
      )}
    </div>
  );
}