import * as React from "react";
import * as RdxAccordion from "@radix-ui/react-accordion";
import { cn } from "../../lib/utils";

export const Accordion = RdxAccordion.Root;
export const AccordionItem = RdxAccordion.Item;

export function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof RdxAccordion.Trigger>) {
  return (
    <RdxAccordion.Header>
      <RdxAccordion.Trigger {...props} className={cn("acc-trigger", className)}>
        {children}
      </RdxAccordion.Trigger>
    </RdxAccordion.Header>
  );
}

export function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof RdxAccordion.Content>) {
  return (
    <RdxAccordion.Content {...props} className={cn("acc-content", className)}>
      {children}
    </RdxAccordion.Content>
  );
}


