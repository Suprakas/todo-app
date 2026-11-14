import { PrimaryButton } from '../components/ui';
import { markOnboarded } from '../lib/onboarding';

/** Onboarding screen (Figma node 20:1511) */
export default function OnboardingPage() {
  const start = () => {
    markOnboarded();
    window.location.replace('/');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <div className="relative flex-1 basis-[65%] overflow-hidden bg-brand" aria-hidden>
        <Ring className="absolute -top-[46px] right-[-18px] size-[88px]" />
        <Zigzag className="absolute top-[54px] left-[-44px] w-[190px]" />
        <Zigzag className="absolute right-[-40px] bottom-[-20px] w-[190px]" />
      </div>

      <div className="flex flex-col px-6 pt-6 pb-safe">
        <h1 className="text-2xl font-semibold text-black">Manage What To Do</h1>
        <p className="mt-4 max-w-[307px] text-xs leading-[18px] text-label">
          The best way to manage what you have to do, don't forget your plans
        </p>
        <PrimaryButton className="mt-24" onClick={start}>
          Get Started
        </PrimaryButton>
      </div>
    </div>
  );
}

/* Decorative shapes from the Figma (redrawn as inline SVG) */

function Zigzag({ className }: { className?: string }) {
  const row = (y: number) => `M4 ${y} l14 -14 l14 14 l14 -14 l14 14 l14 -14 l14 14 l14 -14 l14 14`;
  return (
    <svg viewBox="0 0 120 110" className={className} fill="none" style={{ transform: 'rotate(0deg)' }}>
      <g stroke="#6F8BFF" strokeWidth="5" strokeLinejoin="miter" strokeLinecap="square">
        {[24, 44, 64, 84].map((y) => (
          <path key={y} d={row(y)} />
        ))}
      </g>
    </svg>
  );
}

function Ring({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 88 88" className={className} fill="none">
      <circle cx="44" cy="44" r="34" stroke="#6F8BFF" strokeWidth="20" />
    </svg>
  );
}
