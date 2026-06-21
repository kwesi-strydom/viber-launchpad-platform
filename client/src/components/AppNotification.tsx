import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface AppNotificationProps {
  headerLabel: string;
  title: string;
  subtitle?: string;
  thumbnail_url?: string | null;
  accent?: 'primary' | 'alert';
  onClose: () => void;
}

const AppNotification = ({ headerLabel, title, subtitle, thumbnail_url, accent = 'primary', onClose }: AppNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 100);

    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [onClose]);

  const headerBg = accent === 'alert' ? 'bg-red-600 text-white' : 'bg-primary text-primary-foreground';

  return (
    <div
      className={`w-[320px] transition-all duration-[400ms] ease-[cubic-bezier(.2,.7,.2,1)] ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      <div className="card p-0 overflow-hidden shadow-lg border-primary border">
        <div className="relative">
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-sm bg-ink-900/80 text-ink-300 hover:text-foreground transition-colors backdrop-blur-sm"
            data-testid="button-close-notification"
            aria-label="Close notification"
          >
            <X size={14} />
          </button>

          <div className={`px-4 py-3 border-b border-ink-600 ${headerBg}`}>
            <p className="mono-label !text-current !opacity-90">
              {headerLabel}
            </p>
          </div>

          {thumbnail_url && (
            <div className="relative h-32 overflow-hidden bg-ink-800">
              <img
                src={thumbnail_url}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="p-4">
            <p className="text-sm font-bold text-foreground mb-1 line-clamp-2" data-testid="text-app-title">
              {title}
            </p>
            {subtitle && (
              <p className="text-xs font-mono text-ink-300 uppercase tracking-widest" data-testid="text-team-name">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppNotification;
