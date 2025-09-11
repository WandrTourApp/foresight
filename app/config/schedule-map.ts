export type CanonDept = 'lamination' | 'assembly' | 'finishing' | 'rigging' | 'qc';
type Lane = 'scheduled' | 'actual';

export const SHEET_NAME = '2025';        // the sheet we parse
export const FIRST_WEEK_COLUMN = 'AL';   // first week lives in column AL
export const DEPT_LABEL_COLUMN = 'A';    // for reference; not required by parser

// Two explicit blocks on the same sheet.
// Header rows are 1-based exactly as in Excel. Parser will convert to 0-based.
export const ROWMAP = {
  '40': {
    headerRow1: 1, // "Date of end of week" for model 40
    rows: {
      lamination: { scheduled: 2,  actual: 3  },
      assembly:   { scheduled: 4,  actual: 5  },
      finishing:  { scheduled: 6,  actual: 7  },
      rigging:    { scheduled: 8,  actual: 9  },
      qc:         { scheduled: 10, actual: 11 }, // Seatrial/qc
      detail:     { scheduled: 12, actual: 13 }, // map into qc lane
    } as Record<CanonDept | 'detail', Record<Lane, number>>,
  },
  '26': {
    headerRow1: 15, // <-- spacer before; THIS is the header row for model 26
    rows: {
      lamination: { scheduled: 16, actual: 17 },
      assembly:   { scheduled: 18, actual: 19 },
      finishing:  { scheduled: 20, actual: 21 },
      rigging:    { scheduled: 22, actual: 23 },
      qc:         { scheduled: 24, actual: 25 },
      detail:     { scheduled: 26, actual: 27 }, // map into qc lane
    } as Record<CanonDept | 'detail', Record<Lane, number>>,
  },
} as const;