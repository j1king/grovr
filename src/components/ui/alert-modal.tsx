import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
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

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  variant?: AlertVariant;
  onClose?: () => void;
}

const variantConfig: Record<AlertVariant, { icon: typeof Info; iconClass: string }> = {
  info: {
    icon: Info,
    iconClass: 'text-blue-500 bg-blue-500/10',
  },
  success: {
    icon: CheckCircle,
    iconClass: 'text-green-500 bg-green-500/10',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500 bg-amber-500/10',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-red-500 bg-red-500/10',
  },
};

export function AlertModal({
  open,
  onOpenChange,
  title,
  description,
  variant = 'info',
  onClose,
}: AlertModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleClose = () => {
    onClose?.();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
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
          <ModalDescription className="whitespace-pre-line text-left">{description}</ModalDescription>
        </ModalBody>
        <ModalFooter className="justify-center">
          <Button size="sm" onClick={handleClose}>
            OK
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
