import { useState, useCallback } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ExternalLink } from 'lucide-react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { UpdateInfo, UpdateProgress } from '@/lib/updater';
import { downloadAndInstall, restartApp } from '@/lib/updater';

interface UpdateDialogProps {
  updateInfo: UpdateInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateDialog({ updateInfo, open, onOpenChange }: UpdateDialogProps) {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState<UpdateProgress>({ downloaded: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = useCallback(async () => {
    setStatus('downloading');
    setError(null);

    const success = await downloadAndInstall((p) => setProgress(p));

    if (success) {
      setStatus('ready');
    } else {
      setStatus('error');
      setError('Failed to download update. Please try again later.');
    }
  }, []);

  const handleRestart = useCallback(async () => {
    await restartApp();
  }, []);

  const handleClose = useCallback(() => {
    if (status !== 'downloading') {
      onOpenChange(false);
      // Reset state when closing
      setStatus('idle');
      setProgress({ downloaded: 0, total: 0 });
      setError(null);
    }
  }, [status, onOpenChange]);

  const progressPercent = progress.total > 0
    ? Math.round((progress.downloaded / progress.total) * 100)
    : 0;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>✨ Update Available</ModalTitle>
          <ModalDescription>
            A new version of Grovr is available.
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          {updateInfo && (
            <div className="space-y-5 py-2">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">Current</div>
                  <div className="text-lg font-mono text-muted-foreground">{updateInfo.currentVersion}</div>
                </div>
                <div className="text-muted-foreground">→</div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">New</div>
                  <div className="text-lg font-mono font-semibold">{updateInfo.version}</div>
                </div>
              </div>
              <button
                className="flex items-center justify-center gap-1 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => openUrl(`https://github.com/j1king/grovr/releases/tag/v${updateInfo.version}`)}
              >
                Release notes <ExternalLink size={10} />
              </button>

              {status === 'downloading' && (
                <div className="mt-4 space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {formatBytes(progress.downloaded)} / {formatBytes(progress.total)} ({progressPercent}%)
                  </div>
                </div>
              )}

              {status === 'ready' && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-600 dark:text-green-400">
                  Update downloaded successfully. Restart to apply.
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          {status === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Later
              </Button>
              <Button onClick={handleUpdate}>
                Update Now
              </Button>
            </>
          )}

          {status === 'downloading' && (
            <Button disabled>
              Downloading...
            </Button>
          )}

          {status === 'ready' && (
            <Button onClick={handleRestart}>
              Restart Now
            </Button>
          )}

          {status === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleUpdate}>
                Retry
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
