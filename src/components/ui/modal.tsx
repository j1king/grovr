import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Modal = DialogPrimitive.Root;

const ModalTrigger = DialogPrimitive.Trigger;

const ModalPortal = DialogPrimitive.Portal;

const ModalClose = DialogPrimitive.Close;

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn('modal-overlay', className)}
    {...props}
  />
));
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface ModalContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean;
}

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(({ className, children, showCloseButton = false, ...props }, ref) => (
  <ModalPortal>
    <ModalOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn('modal-content', className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close className="modal-close absolute right-3 top-3">
          <X size={14} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </ModalPortal>
));
ModalContent.displayName = DialogPrimitive.Content.displayName;

const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('modal-header', className)} {...props} />
);
ModalHeader.displayName = 'ModalHeader';

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('modal-title', className)}
    {...props}
  />
));
ModalTitle.displayName = DialogPrimitive.Title.displayName;

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('modal-description', className)}
    {...props}
  />
));
ModalDescription.displayName = DialogPrimitive.Description.displayName;

const ModalBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('modal-body', className)} {...props} />
);
ModalBody.displayName = 'ModalBody';

const ModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('modal-footer', className)} {...props} />
);
ModalFooter.displayName = 'ModalFooter';

export {
  Modal,
  ModalTrigger,
  ModalPortal,
  ModalOverlay,
  ModalContent,
  ModalClose,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
};
