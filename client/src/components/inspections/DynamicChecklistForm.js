// FILE: src/components/inspections/DynamicChecklistForm.js
"use client";

import React, { useState } from 'react';

// shadcn/ui Components
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const DynamicChecklistForm = ({ checklistItem, onSave }) => {
  // State untuk menyimpan data dari setiap kolom
  const [formData, setFormData] = useState({});

  const handleInputChange = (colName, value) => {
    setFormData(prev => ({
      ...prev,
      [colName]: value
    }));
  };

  const handleSubmit = () => {
    onSave(checklistItem.id, formData);
  };

  // Custom Radio Group Component
  const CustomRadioGroup = ({ options, value, onValueChange, name }) => (
    <div className="flex flex-wrap gap-4">
      {options.map((option) => (
        <div key={option} className="flex items-center space-x-2">
          <input
            type="radio"
            id={`radio-${name}-${option}`}
            name={name}
            value={option}
            checked={value === option}
            onChange={(e) => onValueChange(e.target.value)}
            className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
          />
          <Label htmlFor={`radio-${name}-${option}`} className="text-sm font-medium text-foreground">
            {option}
          </Label>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="border-border hover:shadow-md transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header Item */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-foreground text-lg">{checklistItem.item_name}</h3>
              {checklistItem.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {checklistItem.description}
                </p>
              )}
            </div>
            <Badge variant="outline" className="capitalize">
              {checklistItem.category || 'umum'}
            </Badge>
          </div>

          {checklistItem.columns?.map((col, idx) => {
            const value = formData[col.name] || '';

            return (
              <div key={idx} className="space-y-2">
                <Label htmlFor={`col-${idx}`} className="text-sm font-medium text-foreground">
                  {col.name.replace(/_/g, ' ').toUpperCase()}
                </Label>

                {/* Radio */}
                {col.type === 'radio' && (
                  <CustomRadioGroup
                    options={col.options}
                    value={value}
                    onValueChange={(val) => handleInputChange(col.name, val)}
                    name={col.name}
                  />
                )}

                {/* Radio with Text */}
                {col.type === 'radio_with_text' && (
                  <div className="space-y-3">
                    <CustomRadioGroup
                      options={col.options}
                      value={value}
                      onValueChange={(val) => handleInputChange(col.name, val)}
                      name={col.name}
                    />
                    <Input
                      id={`input-${col.name}-text`}
                      placeholder={col.text_label}
                      value={formData[col.text_label] || ''}
                      onChange={(e) => handleInputChange(col.text_label, e.target.value)}
                      className="mt-2 bg-background"
                    />
                  </div>
                )}

                {/* Textarea */}
                {col.type === 'textarea' && (
                  <Textarea
                    id={`textarea-${col.name}`}
                    placeholder={col.label || "Tulis keterangan..."}
                    value={value}
                    onChange={(e) => handleInputChange(col.name, e.target.value)}
                    rows={3}
                    className="bg-background min-h-[100px]"
                  />
                )}

                {/* Input Number */}
                {col.type === 'input_number' && (
                  <div className="relative">
                    <Input
                      id={`number-${col.name}`}
                      type="number"
                      value={value}
                      onChange={(e) => handleInputChange(col.name, e.target.value)}
                      className={col.unit ? "pr-12 bg-background" : "bg-background"}
                    />
                    {col.unit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {col.unit}
                      </span>
                    )}
                  </div>
                )}

                {/* Checkbox Group */}
                {col.type === 'checkbox' && (
                  <div className="space-y-2">
                    {col.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`checkbox-${col.name}-${option}`}
                          checked={formData[col.name]?.includes(option) || false}
                          onChange={(e) => {
                            const currentValues = formData[col.name] || [];
                            const newValues = e.target.checked
                              ? [...currentValues, option]
                              : currentValues.filter(v => v !== option);
                            handleInputChange(col.name, newValues);
                          }}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <Label htmlFor={`checkbox-${col.name}-${option}`} className="text-sm font-medium text-foreground">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {Object.keys(formData).length > 0 ? `${Object.keys(formData).length} field terisi` : 'Belum ada data'}
            </div>
            <Button
              onClick={handleSubmit}
              size="sm"
              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Simpan Checklist
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DynamicChecklistForm;