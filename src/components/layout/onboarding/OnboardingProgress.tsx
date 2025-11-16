interface OnboardingProgressProps {
  step: number;
  totalSteps: number;
}

export default function OnboardingProgress({ step, totalSteps }: OnboardingProgressProps) {
  return (
    <div style={{
      position: 'absolute',
      top: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    }}>
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          style={{
            width: step >= s ? '48px' : '32px',
            height: '6px',
            background: step >= s ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)',
            borderRadius: '3px',
            transition: 'all 0.3s ease'
          }}
        />
      ))}
    </div>
  );
}
