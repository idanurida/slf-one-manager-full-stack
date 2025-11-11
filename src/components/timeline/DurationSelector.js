// src/components/timeline/DurationSelector.js
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const DurationSelector = ({ value = 30, onChange, className = "" }) => {
  const durationOptions = [
    { value: 7, label: "7 hari" },
    { value: 14, label: "14 hari" },
    { value: 30, label: "30 hari" },
    { value: 60, label: "60 hari" },
    { value: 90, label: "90 hari" },
    { value: 180, label: "6 bulan" },
    { value: 365, label: "1 tahun" }
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
        Filter Durasi:
      </span>
      <Select value={value.toString()} onValueChange={(val) => onChange(parseInt(val))}>
        <SelectTrigger className="w-32 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          {durationOptions.map(option => (
            <SelectItem 
              key={option.value} 
              value={option.value.toString()}
              className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DurationSelector;