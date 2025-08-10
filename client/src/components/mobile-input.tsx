import { forwardRef, useEffect, useState } from "react";

interface MobileInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

const MobileInput = forwardRef<HTMLDivElement, MobileInputProps>(({
  value,
  onChange,
  onKeyDown,
  onPaste,
  onDrop,
  onDragOver,
  placeholder,
  disabled,
  className,
  "data-testid": testId,
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
      ref.current.textContent = value;
    }
  }, [value, ref]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || '';
    onChange(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (onPaste) {
      onPaste(e);
    }
    
    // Handle text paste
    const text = e.clipboardData.getData('text/plain');
    if (text && !e.defaultPrevented) {
      e.preventDefault();
      document.execCommand('insertText', false, text);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div
      ref={ref}
      contentEditable={!disabled}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={className}
      data-testid={testId}
      data-placeholder={placeholder}
      // Mobile keyboard GIF support
      inputMode="text"
      data-accept="image/*,image/gif,image/webp,video/*"
      data-capture="environment"
      style={{
        minHeight: '1.5rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
      role="textbox"
      aria-multiline="true"
      aria-placeholder={placeholder}
      suppressContentEditableWarning={true}
    >
      {!value && !isFocused && placeholder && (
        <span 
          className="pointer-events-none absolute text-[var(--discord-light)]/50"
          style={{ userSelect: 'none' }}
        >
          {placeholder}
        </span>
      )}
    </div>
  );
});

MobileInput.displayName = 'MobileInput';

export default MobileInput;