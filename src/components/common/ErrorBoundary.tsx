import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary React pour capturer les erreurs et empêcher le crash de l'application
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Error Boundary a capturé une erreur:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '40px',
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <h1 style={{ color: 'var(--error)', marginBottom: '16px' }}>
            ⚠️ Une erreur s'est produite
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            L'application a rencontré une erreur inattendue. Vous pouvez essayer de recharger la page.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{
              marginTop: '24px',
              padding: '16px',
              background: 'var(--background-secondary)',
              borderRadius: '8px',
              textAlign: 'left',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '12px', fontWeight: 'bold' }}>
                Détails de l'erreur (mode développement)
              </summary>
              <pre style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Réessayer
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: 'var(--background-secondary)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
