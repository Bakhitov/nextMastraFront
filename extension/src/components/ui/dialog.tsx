import * as React from "react";
import * as RdxDialog from "@radix-ui/react-dialog";
import { cn } from "../../lib/utils";

export const Dialog = RdxDialog.Root;
export const DialogTrigger = RdxDialog.Trigger;
export const DialogPortal = RdxDialog.Portal;
export const DialogClose = RdxDialog.Close;

export function DialogOverlay(props: React.ComponentProps<typeof RdxDialog.Overlay>) {
  return <RdxDialog.Overlay {...props} className={cn("dialog-overlay", props.className)} />;
}
export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof RdxDialog.Content>) {
  return (
    <RdxDialog.Content {...props} className={cn("dialog-content", className)}>
      <div className="dialog-inner">{children}</div>
    </RdxDialog.Content>
  );
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof RdxDialog.Title>) {
  return <RdxDialog.Title {...props} className={cn("dialog-title", className)} />;
}


