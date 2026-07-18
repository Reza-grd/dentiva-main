import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = {
  primary: "bg-blue-600 text-white shadow hover:bg-blue-700 hover:shadow-md",
  secondary: "bg-cyan-500 text-white shadow hover:bg-cyan-600 hover:shadow-md",
  danger: "bg-red-500 text-white shadow hover:bg-red-600 hover:shadow-md",
  outline: "border border-gray-300 bg-transparent shadow-sm hover:bg-gray-100 text-gray-700",
  ghost: "hover:bg-gray-100 hover:text-gray-900 text-gray-700",
};

const buttonSizes = {
  sm: "h-8 px-3 text-xs",
  default: "h-10 px-4 py-2",
  lg: "h-12 px-8 text-lg",
  icon: "h-10 w-10 flex items-center justify-center",
};

const Button = forwardRef(({ 
  className, 
  variant = "primary", 
  size = "default", 
  children, 
  disabled,
  isLoading,
  type = "button",
  ...props 
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button, buttonVariants, buttonSizes };
