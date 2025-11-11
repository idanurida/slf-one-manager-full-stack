// client\src\components\client\DocumentCategory.js

import React, { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Folder, FolderOpen, ChevronDown } from "lucide-react";
import { DocumentItem } from "./DocumentItem";

const getCategoryColor = (color) => {
  const colorMap = {
    blue: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20',
    green: 'border-l-green-500 bg-green-50 dark:bg-green-950/20',
    purple: 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20',
    orange: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20',
    teal: 'border-l-teal-500 bg-teal-50 dark:bg-teal-950/20'
  };
  return colorMap[color] || 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
};

export const DocumentCategory = ({
  category,
  categoryKey,
  documentsStatus,
  onDocumentUpload,
  projectId,
  projects
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getCategoryCompletion = (category) => {
    let totalDocs = 0;
    let completedDocs = 0;

    if (category.subkategori) {
      Object.values(category.subkategori).forEach(subCat => {
        subCat.dokumen.forEach(doc => {
          totalDocs++;
          if (documentsStatus[doc.id] === 'approved') completedDocs++;
        });
      });
    } else {
      category.dokumen.forEach(doc => {
        totalDocs++;
        if (documentsStatus[doc.id] === 'approved') completedDocs++;
      });
    }

    return totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;
  };

  const completion = getCategoryCompletion(category);
  const totalDocuments = category.subkategori
    ? Object.values(category.subkategori).reduce((acc, subCat) => acc + subCat.dokumen.length, 0)
    : category.dokumen.length;

  const approvedDocuments = category.subkategori
    ? Object.values(category.subkategori).reduce((acc, subCat) =>
        acc + subCat.dokumen.filter(doc => documentsStatus[doc.id] === 'approved').length, 0)
    : category.dokumen.filter(doc => documentsStatus[doc.id] === 'approved').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={`border rounded-lg bg-card border-l-4 ${getCategoryColor(category.warna)}`}>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/50 transition-colors rounded-lg">
        <div className="flex items-center gap-3">
          {isOpen ? <FolderOpen className="w-5 h-5 text-primary" /> : <Folder className="w-5 h-5 text-primary" />}
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{category.nama_kategori}</h3>
            <p className="text-sm text-muted-foreground">{category.deskripsi}</p>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
              <span>{approvedDocuments}/{totalDocuments} dokumen disetujui</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-24 bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-sm font-medium text-foreground min-w-[40px]">
              {completion}%
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-4 pb-4 space-y-3">
        {category.subkategori ? (
          Object.entries(category.subkategori).map(([subKey, subCategory]) => (
            <div key={subKey} className="mb-4 last:mb-0">
              <h4 className="font-medium text-foreground mb-3 text-sm border-b pb-2">
                {subCategory.nama_subkategori}
              </h4>
              <div className="space-y-2">
                {subCategory.dokumen.map((doc) => (
                  <DocumentItem
                    key={doc.id}
                    doc={doc}
                    status={documentsStatus[doc.id]}
                    onUpload={onDocumentUpload}
                    projectId={projectId}
                    projects={projects}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {category.dokumen.map((doc) => (
              <DocumentItem
                key={doc.id}
                doc={doc}
                status={documentsStatus[doc.id]}
                onUpload={onDocumentUpload}
                projectId={projectId}
                projects={projects}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};