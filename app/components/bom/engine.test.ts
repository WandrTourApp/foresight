// BOM Engine Tests - Pure function testing

import { merge, groupByDept, calculateDeptTotals, BOMItem, OptionRule } from './engine';

// Simple test runner for Node.js
function test(description: string, testFn: () => void) {
  try {
    testFn();
    console.log(`✅ ${description}`);
  } catch (error) {
    console.log(`❌ ${description}`);
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected: T) {
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(expected);
      if (actualStr !== expectedStr) {
        throw new Error(`Expected ${expectedStr}, got ${actualStr}`);
      }
    },
    toHaveLength(expectedLength: number) {
      if (!Array.isArray(actual)) {
        throw new Error('Expected an array');
      }
      if ((actual as any[]).length !== expectedLength) {
        throw new Error(`Expected length ${expectedLength}, got ${(actual as any[]).length}`);
      }
    }
  };
}

// Test data
const baseItems: BOMItem[] = [
  { id: 'HULL-26', name: '26\' Hull', category: 'Lamination', quantity: 1 },
  { id: 'DECK-26', name: '26\' Deck', category: 'Lamination', quantity: 1 },
  { id: 'CONSOLE', name: 'Standard Console', category: 'Assembly', quantity: 1 },
  { id: 'WIRE-12GA', name: '12GA Wire', category: 'Rigging', quantity: 2 }
];

const hardTopOption: OptionRule = {
  id: 'HARD_TOP',
  name: 'Hard Top',
  parts: [
    { id: 'HARDTOP', name: 'Hard Top Assembly', category: 'Assembly', quantity: 1 },
    { id: 'WIRE-12GA', name: '12GA Wire (extra)', category: 'Rigging', quantity: 1 } // Duplicate!
  ],
  removes: ['CONSOLE'] // Remove console
};

const stereoOption: OptionRule = {
  id: 'STEREO',
  name: 'Stereo Upgrade',
  parts: [
    { id: 'AMP-JL', name: 'JL Amplifier', category: 'Rigging', quantity: 1 },
    { id: 'SPEAKERS', name: 'Marine Speakers', category: 'Rigging', quantity: 4 }
  ]
};

const removeOnlyOption: OptionRule = {
  id: 'MINIMAL',
  name: 'Minimal Package',
  removes: ['CONSOLE', 'WIRE-12GA']
};

// Run tests
console.log('Running BOM Engine Tests...\n');

// Test 1: No options (baseline)
test('merge() with no options returns base items unchanged', () => {
  const result = merge(baseItems, [], []);
  expect(result).toHaveLength(4);
  expect(result[0].id).toBe('HULL-26');
});

// Test 2: Remove-only option
test('merge() with remove-only option removes specified items', () => {
  const result = merge(baseItems, [removeOnlyOption], ['MINIMAL']);
  expect(result).toHaveLength(2); // 4 - 2 removed = 2
  expect(result.some(item => item.id === 'CONSOLE')).toBe(false);
  expect(result.some(item => item.id === 'WIRE-12GA')).toBe(false);
});

// Test 3: Add-only option
test('merge() with add-only option adds new items', () => {
  const result = merge(baseItems, [stereoOption], ['STEREO']);
  expect(result).toHaveLength(6); // 4 base + 2 stereo = 6
  expect(result.some(item => item.id === 'AMP-JL')).toBe(true);
  expect(result.some(item => item.id === 'SPEAKERS')).toBe(true);
});

// Test 4: Add + Remove collision (duplicate SKU handling)
test('merge() with add+remove handles duplicate SKUs correctly', () => {
  const result = merge(baseItems, [hardTopOption], ['HARD_TOP']);
  expect(result).toHaveLength(5); // 4 base - 1 removed + 2 added, but 1 duplicate merged = 5
  
  // Console should be removed
  expect(result.some(item => item.id === 'CONSOLE')).toBe(false);
  
  // Hard top should be added
  expect(result.some(item => item.id === 'HARDTOP')).toBe(true);
  
  // Wire should have merged quantity (2 + 1 = 3)
  const wireItem = result.find(item => item.id === 'WIRE-12GA');
  expect(wireItem?.quantity).toBe(3);
});

// Test 5: Multiple options
test('merge() with multiple options applies all correctly', () => {
  const result = merge(baseItems, [hardTopOption, stereoOption], ['HARD_TOP', 'STEREO']);
  expect(result).toHaveLength(7); // Complex calculation: base + hard top changes + stereo
  
  // Should have both option items
  expect(result.some(item => item.id === 'HARDTOP')).toBe(true);
  expect(result.some(item => item.id === 'AMP-JL')).toBe(true);
  expect(result.some(item => item.id === 'SPEAKERS')).toBe(true);
  
  // Console should be removed by hard top option
  expect(result.some(item => item.id === 'CONSOLE')).toBe(false);
});

// Test 6: Empty options array
test('merge() with empty options array returns base unchanged', () => {
  const result = merge(baseItems, [hardTopOption, stereoOption], []);
  expect(result).toHaveLength(4);
  expect(result).toEqual(baseItems);
});

// Test 7: Invalid option ID (should be ignored)
test('merge() ignores invalid option IDs', () => {
  const result = merge(baseItems, [hardTopOption], ['HARD_TOP', 'INVALID_OPTION']);
  expect(result).toHaveLength(5); // Same as test 4
});

// Test 8: Group by department
test('groupByDept() groups items correctly', () => {
  const result = merge(baseItems, [stereoOption], ['STEREO']);
  const grouped = groupByDept(result);
  
  expect(grouped['Lamination']).toHaveLength(2); // Hull + Deck
  expect(grouped['Assembly']).toHaveLength(1);   // Console
  expect(grouped['Rigging']).toHaveLength(3);    // Wire + Amp + Speakers
});

// Test 9: Calculate department totals
test('calculateDeptTotals() calculates correctly', () => {
  const riggingItems = [
    { id: 'WIRE', name: 'Wire', category: 'Rigging', quantity: 2 },
    { id: 'AMP', name: 'Amp', category: 'Rigging', quantity: 1 },
    { id: 'SPEAKERS', name: 'Speakers', category: 'Rigging', quantity: 4 }
  ];
  
  const totals = calculateDeptTotals(riggingItems);
  expect(totals.totalItems).toBe(3);
  expect(totals.totalQuantity).toBe(7); // 2 + 1 + 4
});

console.log('\nAll BOM Engine tests completed!');

// Export test runner for npm script
export function runTests() {
  // Re-run all tests when called
  // This function can be called from a test script
}

// Allow running directly with Node.js
if (typeof require !== 'undefined' && require.main === module) {
  // This is being run directly
}