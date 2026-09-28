import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@dentiva/ui';
import '../../styles/quill-custom.css';

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['clean']
  ],
};

const formats = [
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet'
];

export function RichTextEditor({ value, onChange, placeholder, className, error }) {
  return (
    <div className={cn("w-full relative quill-custom-wrapper", className)}>
      <ReactQuill 
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className={cn(
          "bg-card rounded-md transition-all duration-200 overflow-hidden text-text-primary",
          error 
            ? "border-red-500 ring-1 ring-red-400" 
            : "border border-border hover:border-border focus-within:ring-2 focus-within:ring-accent-primary focus-within:border-accent-primary"
        )}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
}
