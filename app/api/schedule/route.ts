import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parseSchedule, parseScheduleWithReport, getCellRaw, readWorkbookSafe } from '../../lib/schedule-xlsx';
import { SHEET_NAME, FIRST_WEEK_COLUMN, ROWMAP } from '../../config/schedule-map';
import { expandRuns } from '../../lib/schedule-types';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const debug = url.searchParams.get('debug') === '1';
    const scan = url.searchParams.get('scan') === '1';
    const flat = url.searchParams.get('flat') === '1';
    
    if (scan) {
      const wb = readWorkbookSafe();
      const ws = wb.Sheets[SHEET_NAME];
      const firstCol = XLSX.utils.decode_col(FIRST_WEEK_COLUMN);
      const colsToShow = Array.from({length: 10}, (_,i)=> firstCol + i); // first 10 weeks
      const out:any = {};
      for (const model of Object.keys(ROWMAP) as Array<'40'|'26'>) {
        out[model] = {};
        for (const [dept, lanes] of Object.entries(ROWMAP[model].rows)) {
          out[model][dept] = {
            scheduled: colsToShow.map(c => getCellRaw(ws, lanes.scheduled - 1, c) ?? ''),
            actual:    colsToShow.map(c => getCellRaw(ws, lanes.actual    - 1, c) ?? ''),
          };
        }
      }
      return NextResponse.json({ sheet: SHEET_NAME, firstCol: FIRST_WEEK_COLUMN, previewCols: colsToShow.length, rows: out }, { headers: {'Cache-Control':'no-store'} });
    }
    
    if (debug) {
      const { data, report } = await parseScheduleWithReport();
      
      return NextResponse.json({
        ...data,
        __report: report
      }, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    } else {
      const scheduleData = await parseSchedule();
      const payload: any = scheduleData;
      
      if (flat && scheduleData.actual) {
        payload.actual_flat = expandRuns(scheduleData.actual);
      }
      
      return NextResponse.json(payload, {
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }
  } catch (error) {
    console.error('Error in /api/schedule:', error);
    
    return NextResponse.json(
      { error: 'Failed to parse schedule' },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}