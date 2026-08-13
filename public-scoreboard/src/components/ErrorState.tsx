export default function ErrorState({ message }: { message: string }) {
  return (
    <div className="error-state">
      <div className="error-icon">⚠️</div>
      <div className="error-message">{message}</div>
    </div>
  );
}
