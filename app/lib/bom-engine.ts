// BOM Engine - Pure functions for handling BOM calculations

import { BOMItem, Option, OptionEffect } from './types';

/**
 * Apply option effects to a base BOM
 * Rule: FINAL = (BASE – REMOVES) + ADDS; fold duplicate SKUs by summing qty
 */
export function applyOptionsToBOM(baseBOM: BOMItem[], selectedOptions: Option[]): BOMItem[] {
  // Start with base BOM
  let workingBOM = [...baseBOM];

  // Apply each selected option
  for (const option of selectedOptions) {
    workingBOM = applyOptionEffects(workingBOM, option.effects);
  }

  // Fold duplicate SKUs by summing quantities
  return foldDuplicateSKUs(workingBOM);
}

/**
 * Apply a single option's effects (adds and removes) to a BOM
 */
export function applyOptionEffects(bom: BOMItem[], effects: OptionEffect): BOMItem[] {
  let result = [...bom];

  // Apply removes first - remove items by SKU
  if (effects.remove && effects.remove.length > 0) {
    const skusToRemove = new Set(effects.remove.map(r => r.sku));
    result = result.filter(item => !skusToRemove.has(item.sku));
  }

  // Apply adds - add new items to the BOM
  if (effects.add && effects.add.length > 0) {
    result = [...result, ...effects.add];
  }

  return result;
}

/**
 * Fold duplicate SKUs by summing their quantities
 * Keeps the first occurrence's metadata (name, unit, dept) and sums qty
 */
export function foldDuplicateSKUs(bom: BOMItem[]): BOMItem[] {
  const skuMap = new Map<string, BOMItem>();

  for (const item of bom) {
    if (skuMap.has(item.sku)) {
      // Sum the quantity, keep first occurrence's metadata
      const existing = skuMap.get(item.sku)!;
      existing.qty += item.qty;
    } else {
      // First occurrence, add to map
      skuMap.set(item.sku, { ...item });
    }
  }

  return Array.from(skuMap.values());
}

/**
 * Group BOM items by department for picklist display
 */
export function groupBOMByDepartment(bom: BOMItem[]): { dept: string; items: BOMItem[] }[] {
  const deptMap = new Map<string, BOMItem[]>();

  // Group items by department
  for (const item of bom) {
    if (!deptMap.has(item.dept)) {
      deptMap.set(item.dept, []);
    }
    deptMap.get(item.dept)!.push(item);
  }

  // Convert to array and sort by department name
  return Array.from(deptMap.entries())
    .map(([dept, items]) => ({ dept, items }))
    .sort((a, b) => a.dept.localeCompare(b.dept));
}

/**
 * Validate that all option IDs exist in the options list
 */
export function validateSelectedOptions(selectedOptionIds: string[], availableOptions: Option[]): string[] {
  const availableIds = new Set(availableOptions.map(opt => opt.id));
  return selectedOptionIds.filter(id => !availableIds.has(id));
}

/**
 * Calculate total quantity for a department
 */
export function calculateDepartmentTotals(items: BOMItem[]): { totalItems: number; totalQty: number } {
  return {
    totalItems: items.length,
    totalQty: items.reduce((sum, item) => sum + item.qty, 0)
  };
}

/**
 * Find option conflicts (same SKU added by multiple options)
 */
export function findOptionConflicts(selectedOptions: Option[]): { sku: string; conflictingOptions: string[] }[] {
  const skuToOptions = new Map<string, string[]>();
  
  // Map each added SKU to the options that add it
  for (const option of selectedOptions) {
    for (const addedItem of option.effects.add) {
      if (!skuToOptions.has(addedItem.sku)) {
        skuToOptions.set(addedItem.sku, []);
      }
      skuToOptions.get(addedItem.sku)!.push(option.id);
    }
  }

  // Find SKUs added by multiple options
  const conflicts: { sku: string; conflictingOptions: string[] }[] = [];
  for (const [sku, optionIds] of skuToOptions) {
    if (optionIds.length > 1) {
      conflicts.push({ sku, conflictingOptions: optionIds });
    }
  }

  return conflicts;
}