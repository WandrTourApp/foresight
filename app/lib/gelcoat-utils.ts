/**
 * Utility functions for gelcoat alert handling
 * 
 * Global rule: Matterhorn White and Dresden Blue do NOT show gelcoat alerts/ladder chips.
 * All other colors retain existing alert/ladder behavior.
 */

/**
 * Check if a gelcoat color should show alerts/ladder chips
 * @param color - The gelcoat color string
 * @returns true if alerts should be shown, false if they should be hidden
 */
export function isGelcoatAlertColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }

  const noAlertColors = ['Matterhorn White', 'Dresden Blue'];
  return !noAlertColors.includes(color.trim());
}

/**
 * Check if gelcoat alerts should be shown for a boat
 * @param boat - Boat object with hullColor or gelcoat_color property
 * @returns true if alerts should be shown
 */
export function shouldShowGelcoatAlerts(boat: any): boolean {
  const color = boat?.hullColor || boat?.gelcoat_color;
  return isGelcoatAlertColor(color);
}

/**
 * Get gelcoat alert status for display
 * @param color - The gelcoat color string
 * @returns object with display information
 */
export function getGelcoatAlertStatus(color: string) {
  const shouldAlert = isGelcoatAlertColor(color);
  
  return {
    shouldAlert,
    chipText: shouldAlert ? '🎨 Gelcoat Alert' : null,
    chipClass: shouldAlert ? 'bg-blue-100 text-blue-800 border border-blue-300' : null,
    reason: shouldAlert ? 'Custom color requires gelcoat planning' : 'Standard color - no alerts needed'
  };
}