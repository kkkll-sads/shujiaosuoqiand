import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  className?: string;
  fullWidth?: boolean;
}

export const Button = ({
  children,
  variant = 'primary',
  className = '',
  fullWidth = true,
  ...props
}: PropsWithChildren<ButtonProps>) => {
  const baseStyle =
    'h-[48px] rounded-2xl font-medium text-lg flex items-center justify-center transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50';
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-gradient-to-r from-primary-start to-primary-end text-white shadow-soft',
    secondary: 'bg-bg-card text-text-main border border-border-light shadow-soft',
    outline: 'bg-transparent border border-primary-start text-primary-start',
    ghost: 'bg-transparent text-text-sub',
  };

  return (
    <button
      className={`${baseStyle} ${fullWidth ? 'w-full' : ''} ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};
