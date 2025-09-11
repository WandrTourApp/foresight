// UI Polish Kit - Consistent styling classes and components

export const uiKit = {
  // Card styles
  card: {
    base: "bg-white border border-gray-200 rounded-lg shadow-sm",
    padded: "bg-white border border-gray-200 rounded-lg shadow-sm p-6",
    elevated: "bg-white border border-gray-200 rounded-lg shadow-md p-6",
  },
  
  // Button styles
  button: {
    primary: "bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
    danger: "bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
    small: "py-1 px-3 text-sm",
    large: "py-3 px-6 text-lg",
    disabled: "opacity-50 cursor-not-allowed",
  },
  
  // Badge/Chip styles
  badge: {
    base: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800", 
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-800",
  },
  
  // Table styles
  table: {
    container: "overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg",
    table: "min-w-full divide-y divide-gray-300",
    header: "bg-gray-50",
    headerCell: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
    body: "bg-white divide-y divide-gray-200",
    row: "hover:bg-gray-50",
    cell: "px-6 py-4 whitespace-nowrap text-sm text-gray-900",
    cellSecondary: "px-6 py-4 whitespace-nowrap text-sm text-gray-500",
  },
  
  // Input styles
  input: {
    base: "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm",
    label: "block text-sm font-medium text-gray-700 mb-1",
    error: "border-red-300 focus:ring-red-500 focus:border-red-500",
    errorText: "mt-1 text-sm text-red-600",
  },
  
  // Layout styles
  layout: {
    container: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    section: "py-6",
    grid: "grid gap-6",
    gridCols2: "grid grid-cols-1 lg:grid-cols-2 gap-6",
    gridCols3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
  },
  
  // Status indicators
  status: {
    dot: "inline-block w-2 h-2 rounded-full mr-2",
    dotGreen: "inline-block w-2 h-2 rounded-full mr-2 bg-green-400",
    dotYellow: "inline-block w-2 h-2 rounded-full mr-2 bg-yellow-400",
    dotRed: "inline-block w-2 h-2 rounded-full mr-2 bg-red-400",
    dotGray: "inline-block w-2 h-2 rounded-full mr-2 bg-gray-400",
  },
};

// Helper function to combine classes
export const cn = (...classes: (string | undefined | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};