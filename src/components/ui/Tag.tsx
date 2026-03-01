import React from 'react';

export const Tag = ({ children, variant = 'default' }: any) => {
  const variants: any = {
    default: "bg-border-light text-text-sub",
    primary: "bg-primary-start/10 text-primary-start",
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-[6px] text-[12px] ${variants[variant]}`}>
      {children}
    </span>
  );
};
