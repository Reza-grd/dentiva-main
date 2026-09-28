import React, { useState, useRef, useId, useEffect } from "react";
import { cn } from "./cn";

/**
 * Tooltip — Accessible hover + focus tooltip.
 *
 *   <Tooltip content="Delete record" side="bottom">
 *     <button aria-label="Delete"><Trash2 /></button>
 *   </Tooltip>
 */

type Side = "top" | "bottom" | "left" | "right";

const sideClasses: Record<Side, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowClasses: Record<Side, string> = {
  top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800 dark:border-t-gray-200",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800 dark:border-b-gray-200",
  left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800 dark:border-l-gray-200",
  right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800 dark:border-r-gray-200",
};

type TriggerProps = {
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onFocus?: (e: React.FocusEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  "aria-describedby"?: string;
};

export interface TooltipProps {
  content: React.ReactNode;
  side?: Side;
  children: React.ReactElement<TriggerProps>;
  className?: string;
  delayMs?: number;
}

const Tooltip = ({ content, side = "top", children, className, delayMs = 300 }: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tooltipId = useId();

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delayMs);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const trigger = React.Children.only(children);
  const triggerWithProps = React.cloneElement(trigger, {
    "aria-describedby": visible ? tooltipId : undefined,
    onMouseEnter: (e: React.MouseEvent) => { show(); trigger.props.onMouseEnter?.(e); },
    onMouseLeave: (e: React.MouseEvent) => { hide(); trigger.props.onMouseLeave?.(e); },
    onFocus: (e: React.FocusEvent) => { show(); trigger.props.onFocus?.(e); },
    onBlur: (e: React.FocusEvent) => { hide(); trigger.props.onBlur?.(e); },
  });

  return (
    <div className="relative inline-flex">
      {triggerWithProps}
      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn("absolute z-50 whitespace-nowrap", sideClasses[side], className)}
        >
          <div
            className={cn(
              "px-2.5 py-1.5 text-xs font-medium rounded-lg",
              "bg-card border border-border text-text-primary",
              "shadow-lg",
              "animate-in fade-in duration-150"
            )}
          >
            {content}
          </div>
          <div className={cn("absolute w-0 h-0 border-4", arrowClasses[side])} aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export { Tooltip };
