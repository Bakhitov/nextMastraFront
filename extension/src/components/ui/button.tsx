import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "btn",
  {
    variants: {
      variant: {
        default: "btn-primary",
        outline: "btn",
        destructive: "btn btn-danger",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
    );
  }
);
Button.displayName = "Button";


