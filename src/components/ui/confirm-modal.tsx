import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal';

type ConfirmVariant = 'info' | 'warning' | 'destructive';

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  loadingLabel?: string;
}

const variantConfig: Record<ConfirmVariant, { icon: typeof Info; iconClass: string; buttonVariant: 'default' | 'destructive' }> = {
  info: {
    icon: Info,
    iconClass: 'text-blue-500 bg-blue-500/10',
    buttonVariant: 'default',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500 bg-amber-500/10',
    buttonVariant: 'default',
  },
  destructive: {
    icon: Trash2,
    iconClass: 'text-red-500 bg-red-500/10',
    buttonVariant: 'destructive',
  },
};

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  onConfirm,
  onCancel,
  loading = false,
  loadingLabel,
}: ConfirmModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
    // If loadingLabel is provided, parent controls closing via onOpenChange
    // Otherwise auto-close for backwards compatibility
    if (!loadingLabel) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (loading) return; // Prevent cancel while loading
    onCancel();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Prevent closing while loading
    if (!newOpen && loading) return;
    onOpenChange(newOpen);
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange}>
      <ModalContent>
        <div className="modal-icon-container">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.iconClass}`}>
            <Icon size={24} />
          </div>
        </div>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <ModalDescription className="whitespace-pre-line">{description}</ModalDescription>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={config.buttonVariant} size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? (loadingLabel || confirmLabel) : confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
