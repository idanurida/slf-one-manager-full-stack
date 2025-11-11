// client\src\components\client\StatCard.js

import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export const StatCard = ({ label, value, icon: IconComponent, colorScheme, helpText, suffix = "" }) => {
  const colorClasses = {
    primary: 'text-primary dark:text-primary',
    secondary: 'text-secondary dark:text-secondary',
    destructive: 'text-destructive dark:text-destructive',
    success: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    orange: 'text-orange-600 dark:text-orange-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    teal: 'text-teal-600 dark:text-teal-400',
  };

  const baseColor = colorClasses[colorScheme] || 'text-muted-foreground';

  return (
    <Card className="p-4 flex flex-col justify-between h-full hover:shadow-md transition-shadow border-border bg-card">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Info className={`w-4 h-4 cursor-help ${baseColor}`} />
          </TooltipTrigger>
          <TooltipContent className="bg-popover border-border">
            <p className="text-sm text-popover-foreground">{helpText}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <p className={`text-3xl font-bold ${baseColor}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
        <IconComponent className={`w-6 h-6 opacity-70 ${baseColor}`} />
      </div>
    </Card>
  );
};