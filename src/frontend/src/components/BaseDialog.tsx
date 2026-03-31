import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ReactNode } from "react";

interface BaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  trigger?: ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

/**
 * BaseDialog Component
 *
 * A standardized dialog component that provides consistent behavior across the app:
 * - Prevents accidental closes when clicking outside
 * - Provides consistent styling and structure
 * - Handles scrolling for long content
 * - Integrates with FocusManager for stable focus behavior
 *
 * Usage:
 * ```tsx
 * <BaseDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Dialog Title"
 *   description="Optional description"
 * >
 *   <YourFormContent />
 * </BaseDialog>
 * ```
 */
export function BaseDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  className,
  maxWidth = "lg",
}: BaseDialogProps) {
  const maxWidthClass = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
  }[maxWidth];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={`${maxWidthClass} max-h-[90vh] overflow-y-auto ${className || ""}`}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
