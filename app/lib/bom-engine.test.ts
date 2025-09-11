// BOM Engine Tests
// Run with: node -r ts-node/register bom-engine.test.ts

import { 
  applyOptionsToBOM, 
  applyOptionEffects, 
  foldDuplicateSKUs, 
  groupBOMByDepartment,
  validateSelectedOptions,
  findOptionConflicts
} from './bom-engine';
import { BOMItem, Option } from './types';

// Simple test runner
function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message || 'Assertion failed'}\nActual: ${actualStr}\nExpected: ${expectedStr}`);
  }
}

// Test data
const baseBOM: BOMItem[] = [
  { sku: 'HULL-26', name: '26 Hull', qty: 1, unit: 'ea', dept: 'Lamination' },
  { sku: 'DECK-26', name: '26 Deck', qty: 1, unit: 'ea', dept: 'Lamination' },
  { sku: 'CONSOLE-STD', name: 'Standard Console', qty: 1, unit: 'ea', dept: 'Assembly' },
  { sku: 'WIRE-12GA', name: '12ga Wire', qty: 2, unit: 'roll', dept: 'Rigging' }
];

const hardTopOption: Option = {
  id: 'hard_top',
  name: 'Hard Top',
  effects: {
    add: [
      { sku: 'HARDTOP-001', name: 'Hard Top Kit', qty: 1, unit: 'ea', dept: 'Assembly' },
      { sku: 'WIRE-12GA', name: '12ga Wire Extra', qty: 1, unit: 'roll', dept: 'Rigging' }
    ],
    remove: [{ sku: 'CONSOLE-STD' }]
  }
};

const stereoOption: Option = {
  id: 'stereo',
  name: 'Stereo Upgrade', 
  effects: {
    add: [
      { sku: 'AMP-JL', name: 'JL Amp', qty: 1, unit: 'ea', dept: 'Rigging' },
      { sku: 'SPEAKER-6', name: '6" Speakers', qty: 4, unit: 'ea', dept: 'Rigging' }
    ],
    remove: []
  }
};

// Run tests
console.log('Running BOM Engine Tests...\n');

// Test 1: Remove only
test('applyOptionEffects - remove only', () => {
  const removeOnlyOption = { add: [], remove: [{ sku: 'CONSOLE-STD' }] };
  const result = applyOptionEffects(baseBOM, removeOnlyOption);
  assertEqual(result.length, 3);
  assertEqual(result.some(item => item.sku === 'CONSOLE-STD'), false);
});

// Test 2: Add only  
test('applyOptionEffects - add only', () => {
  const addOnlyOption = { add: [{ sku: 'NEW-ITEM', name: 'New Item', qty: 1, unit: 'ea', dept: 'Test' }], remove: [] };
  const result = applyOptionEffects(baseBOM, addOnlyOption);
  assertEqual(result.length, 5);
  assertEqual(result[4].sku, 'NEW-ITEM');
});

// Test 3: Add + remove collision (same SKU)
test('applyOptionEffects - add + remove collision', () => {
  const result = applyOptionEffects(baseBOM, hardTopOption.effects);
  // CONSOLE-STD removed, HARDTOP-001 and extra WIRE-12GA added
  assertEqual(result.length, 5); // 4 original - 1 removed + 2 added = 5
  assertEqual(result.some(item => item.sku === 'CONSOLE-STD'), false);
  assertEqual(result.some(item => item.sku === 'HARDTOP-001'), true);
});

// Test 4: Duplicate SKU quantity folding
test('foldDuplicateSKUs - quantity summing', () => {
  const bomWithDuplicates: BOMItem[] = [
    { sku: 'WIRE-12GA', name: '12ga Wire', qty: 2, unit: 'roll', dept: 'Rigging' },
    { sku: 'WIRE-12GA', name: '12ga Wire Extra', qty: 1, unit: 'roll', dept: 'Rigging' },
    { sku: 'OTHER', name: 'Other Item', qty: 1, unit: 'ea', dept: 'Test' }
  ];
  
  const result = foldDuplicateSKUs(bomWithDuplicates);
  assertEqual(result.length, 2);
  
  const wireItem = result.find(item => item.sku === 'WIRE-12GA');
  assertEqual(wireItem?.qty, 3); // 2 + 1 = 3
  assertEqual(wireItem?.name, '12ga Wire'); // Keeps first occurrence name
});

// Test 5: Full option application with folding
test('applyOptionsToBOM - full integration', () => {
  const result = applyOptionsToBOM(baseBOM, [hardTopOption]);
  
  // Should have: HULL-26, DECK-26, HARDTOP-001, WIRE-12GA (qty: 3)
  assertEqual(result.length, 4);
  assertEqual(result.some(item => item.sku === 'CONSOLE-STD'), false); // Removed
  assertEqual(result.some(item => item.sku === 'HARDTOP-001'), true); // Added
  
  const wireItem = result.find(item => item.sku === 'WIRE-12GA');
  assertEqual(wireItem?.qty, 3); // 2 original + 1 from option = 3
});

// Test 6: Multiple options
test('applyOptionsToBOM - multiple options', () => {
  const result = applyOptionsToBOM(baseBOM, [hardTopOption, stereoOption]);
  
  // Verify specific items exist
  assertEqual(result.some(item => item.sku === 'AMP-JL'), true);
  assertEqual(result.some(item => item.sku === 'SPEAKER-6'), true);
  assertEqual(result.some(item => item.sku === 'HARDTOP-001'), true);
  assertEqual(result.some(item => item.sku === 'CONSOLE-STD'), false); // Still removed
});

// Test 7: Department grouping
test('groupBOMByDepartment', () => {
  const grouped = groupBOMByDepartment(baseBOM);
  
  assertEqual(grouped.length, 3); // Assembly, Lamination, Rigging
  assertEqual(grouped[0].dept, 'Assembly'); // Sorted alphabetically
  assertEqual(grouped[0].items.length, 1);
  assertEqual(grouped[1].dept, 'Lamination');
  assertEqual(grouped[1].items.length, 2);
  assertEqual(grouped[2].dept, 'Rigging');
  assertEqual(grouped[2].items.length, 1);
});

// Test 8: Option validation
test('validateSelectedOptions', () => {
  const options = [hardTopOption, stereoOption];
  
  const validIds = validateSelectedOptions(['hard_top', 'stereo'], options);
  assertEqual(validIds.length, 0); // No invalid IDs
  
  const invalidIds = validateSelectedOptions(['hard_top', 'invalid', 'stereo', 'also_invalid'], options);
  assertEqual(invalidIds, ['invalid', 'also_invalid']);
});

// Test 9: Option conflicts
test('findOptionConflicts', () => {
  const conflictingOption: Option = {
    id: 'conflict_test',
    name: 'Conflict Test',
    effects: {
      add: [{ sku: 'AMP-JL', name: 'Another JL Amp', qty: 1, unit: 'ea', dept: 'Rigging' }],
      remove: []
    }
  };
  
  const conflicts = findOptionConflicts([stereoOption, conflictingOption]);
  assertEqual(conflicts.length, 1);
  assertEqual(conflicts[0].sku, 'AMP-JL');
  assertEqual(conflicts[0].conflictingOptions, ['stereo', 'conflict_test']);
});

console.log('\nAll tests completed!');