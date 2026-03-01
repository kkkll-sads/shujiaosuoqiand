import React from 'react';
import { Check } from 'lucide-react';

export const Checkbox = ({ checked, onChange, label, className = '' }: any) => {
  return (
    <label className={`flex items-center cursor-pointer ${className}`}>
      <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${checked ? 'bg-primary-start border-primary-start' : 'border-text-aux bg-transparent'}`}>
        {checked && <Check size={12} className="text-white" />}
      </div>
      {label && <span className="ml-2 text-[12px] text-text-sub">{label}</span>}
      <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
    </label>
  );
};
