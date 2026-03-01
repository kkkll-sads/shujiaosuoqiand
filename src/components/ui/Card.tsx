import React from 'react';

export const Card = ({ children, className = '' }: any) => {
  return (
    <div className={`bg-bg-card rounded-[16px] p-4 shadow-soft ${className}`}>
      {children}
    </div>
  );
};
