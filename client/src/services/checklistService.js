import checklistData from '../data/checklistData.json';

export const checklistService = {
  // Get all checklist templates
  getChecklistTemplates: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: checklistData.checklist_templates || []
        });
      }, 300);
    });
  },

  // Get template by ID
  getTemplateById: (templateId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const template = checklistData.checklist_templates.find(
          tpl => tpl.id === templateId
        );
        resolve({
          success: true,
          data: template || null
        });
      }, 300);
    });
  },

  // Get templates by category
  getTemplatesByCategory: (category) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const templates = checklistData.checklist_templates.filter(
          tpl => tpl.category === category
        );
        resolve({
          success: true,
          data: templates || []
        });
      }, 300);
    });
  },

  // Get all unique categories
  getUniqueCategories: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const categories = [...new Set(
          checklistData.checklist_templates.map(tpl => tpl.category)
        )].filter(Boolean);
        
        resolve({
          success: true,
          data: categories
        });
      }, 200);
    });
  },

  // Get flattened checklist items (untuk kompatibilitas dengan komponen inspector)
  getFlattenedChecklistItems: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const items = [];
        checklistData.checklist_templates.forEach((template) => {
          const category = template.category || 'administrative';

          if (template.subsections) {
            template.subsections.forEach((subsection) => {
              subsection.items.forEach((item) => {
                items.push({
                  ...item,
                  template_id: template.id,
                  template_title: template.title,
                  category,
                  subsection_title: subsection.title,
                  applicable_for: subsection.applicable_for || template.applicable_for || []
                });
              });
            });
          } else if (template.items) {
            template.items.forEach((item) => {
              items.push({
                ...item,
                template_id: template.id,
                template_title: template.title,
                category,
                applicable_for: template.applicable_for || []
              });
            });
          }
        });

        resolve({
          success: true,
          data: items
        });
      }, 400);
    });
  },

  // Get items by category (untuk filter di komponen inspector)
  getItemsByCategory: (category) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const allItems = [];
        checklistData.checklist_templates.forEach((template) => {
          const templateCategory = template.category || 'administrative';

          if (template.subsections) {
            template.subsections.forEach((subsection) => {
              subsection.items.forEach((item) => {
                allItems.push({
                  ...item,
                  template_id: template.id,
                  template_title: template.title,
                  category: templateCategory,
                  subsection_title: subsection.title,
                  applicable_for: subsection.applicable_for || template.applicable_for || []
                });
              });
            });
          } else if (template.items) {
            template.items.forEach((item) => {
              allItems.push({
                ...item,
                template_id: template.id,
                template_title: template.title,
                category: templateCategory,
                applicable_for: template.applicable_for || []
              });
            });
          }
        });

        const filteredItems = allItems.filter(item => item.category === category);
        
        resolve({
          success: true,
          data: filteredItems
        });
      }, 400);
    });
  }
};