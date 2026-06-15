// Баннер ошибки с устойчивым data-testid для автотестов.

interface Props {
  message: string | null;
  testId?: string;
}

export function ErrorBanner({ message, testId = 'error-banner' }: Props) {
  if (!message) return null;
  return (
    <div className="error-banner" data-testid={testId} role="alert">
      {message}
    </div>
  );
}
