// BOM Engine - Pure functions for calculating final BOMs
// Rule: FINAL = (BASE – REMOVES) + ADDS; fold duplicate SKUs by summing qty

export interface BOMItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  pickLocation?: string;
  staging?: Array<{ location: string; quantity: number }>;
}

export interface OptionRule {
  id: string;
  name: string;
  parts?: BOMItem[];  // Items to ADD
  removes?: string[]; // Item IDs to REMOVE
}

/**
 * Merge base BOM with selected options to create final BOM
 * @param baseItems - Base BOM items
 * @param optionRules - Available option rules (array or record)
 * @param selectedOptionIds - IDs of selected options
 * @returns Final BOM items with duplicates merged
 */
export function merge(
  baseItems: BOMItem[],
  optionRules: OptionRule[] | Record<string, any>,
  selectedOptionIds: string[]
): BOMItem[] {
  // Start with base items
  let workingItems = [...baseItems];

  // Before applying options, normalize optionRules to an array:
  const optionsArr = Array.isArray(optionRules)
    ? optionRules
    : optionRules
      ? Object.values(optionRules as Record<string, any>)
      : [];

  // Apply each selected option
  for (const optionId of selectedOptionIds || []) {
    const option = optionsArr.find((opt: any) => opt?.id === optionId);
    if (option) {
      workingItems = applyOption(workingItems, option);
    }
  }

  // Fold duplicate SKUs
  return foldDuplicates(workingItems);
}

/**
 * Apply a single option to the working BOM
 */
function applyOption(items: BOMItem[], option: OptionRule): BOMItem[] {
  let result = [...items];

  // Remove items first
  if (option.removes && option.removes.length > 0) {
    const removeIds = new Set(option.removes);
    result = result.filter(item => !removeIds.has(item.id));
  }

  // Add new items
  if (option.parts && option.parts.length > 0) {
    result = [...result, ...option.parts];
  }

  return result;
}

/**
 * Fold duplicate items by summing quantities
 * Keeps first occurrence's metadata, sums quantities
 */
function foldDuplicates(items: BOMItem[]): BOMItem[] {
  const itemMap = new Map<string, BOMItem>();

  for (const item of items) {
    if (itemMap.has(item.id)) {
      // Sum quantity, keep first occurrence's metadata
      const existing = itemMap.get(item.id)!;
      existing.quantity += item.quantity;
    } else {
      // First occurrence, add to map
      itemMap.set(item.id, { ...item });
    }
  }

  return Array.from(itemMap.values());
}

/**
 * Group final BOM items by department/category
 * @param finalItems - Final BOM items
 * @returns Object mapping department to items
 */
export function groupByDept(finalItems: BOMItem[]): Record<string, BOMItem[]> {
  const groups: Record<string, BOMItem[]> = {};

  for (const item of finalItems) {
    const dept = item.category || 'Unknown';
    if (!groups[dept]) {
      groups[dept] = [];
    }
    groups[dept].push(item);
  }

  // Sort items within each department by name
  Object.keys(groups).forEach(dept => {
    groups[dept].sort((a, b) => a.name.localeCompare(b.name));
  });

  return groups;
}

/**
 * Calculate totals for a department
 */
export function calculateDeptTotals(items: BOMItem[]): {
  totalItems: number;
  totalQuantity: number;
} {
  return {
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
  };
}