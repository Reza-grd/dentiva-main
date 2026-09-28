import React, { forwardRef, useState, useRef, useId, useEffect } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * Tooltip — Accessible hover + focus tooltip.
 * Renders tooltip content above the trigger by default.
 * Keyboard users see the tooltip on :focus of the trigger element.
 *
 * Usage:
 *   <Tooltip content="This is a tooltip">
 *     <Button>Hover me</Button>
 *   </Tooltip>
 *
 *   <Tooltip content="Delete record" side="bottom">
 *     <button aria-label="Delete"><Trash2 /></button>
 *   </Tooltip>
 */

const sideClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowClasses = {
  top: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-800 dark:border-t-gray-200",
  bottom: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-800 dark:border-b-gray-200",
  left: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-800 dark:border-l-gray-200",
  right: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-800 dark:border-r-gray-200",
};

const Tooltip = ({
  content,
  side = "top",
  children,
  className,
  delayMs = 300,
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const tooltipId = useId();

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delayMs);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Clone the child to inject aria-describedby and event handlers
  const trigger = React.Children.only(children);
  const triggerWithProps = React.cloneElement(trigger, {
    "aria-describedby": visible ? tooltipId : undefined,
    onMouseEnter: (e) => { show(); trigger.props.onMouseEnter?.(e); },
    onMouseLeave: (e) => { hide(); trigger.props.onMouseLeave?.(e); },
    onFocus: (e) => { show(); trigger.props.onFocus?.(e); },
    onBlur: (e) => { hide(); trigger.props.onBlur?.(e); },
  });

  return (
    <div className="relative inline-flex">
      {triggerWithProps}
      {visible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap",
            sideClasses[side],
            className
          )}
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
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-0 h-0 border-4",
              arrowClasses[side]
            )}
            aria-hidden="true"
          />
        </div>
      )}
    </div>
  );
};

export { Tooltip };
