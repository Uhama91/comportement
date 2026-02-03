import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'Erreur inconnue';
      const isDbLockError = errorMessage.toLowerCase().includes('lock') ||
                           errorMessage.toLowerCase().includes('database') ||
                           errorMessage.toLowerCase().includes('busy');

      return (
        <div className="h-screen flex items-center justify-center bg-slate-100 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
            <div className="text-4xl mb-4">
              {isDbLockError ? '🔒' : '❌'}
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">
              {isDbLockError ? 'Application déjà ouverte' : 'Erreur de chargement'}
            </h1>
            <p className="text-slate-600 mb-4 text-sm">
              {isDbLockError
                ? 'L\'application est peut-être déjà lancée. Vérifiez dans la barre des tâches (icône en bas à droite).'
                : errorMessage
              }
            </p>
            {isDbLockError && (
              <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-left text-xs">
                <p className="font-medium text-amber-800 mb-1">Solutions :</p>
                <ol className="text-amber-700 list-decimal ml-4 space-y-1">
                  <li>Cliquez sur l'icône Comportement dans la barre des tâches</li>
                  <li>Ou fermez complètement l'application et relancez</li>
                  <li>Ou redémarrez l'ordinateur</li>
                </ol>
              </div>
            )}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
