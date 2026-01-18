import type { UpdateInfo } from '@/lib/updater';

interface UpdateBadgeProps {
  updateInfo: UpdateInfo | null;
  onClick: () => void;
}

export function UpdateBadge({ updateInfo, onClick }: UpdateBadgeProps) {
  if (!updateInfo) return null;

  return (
    <button
      className="relative px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      onClick={onClick}
    >
      Update available
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
    </button>
  );
}
