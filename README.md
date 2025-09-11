# Foresight MVP - Boat Production Management

A simple web app that replaces spreadsheets with a cleaner, button-first UI for boat production management.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## 🎯 MVP Core Features

### User Flow (matches exact requirements):
1. **Intake**: Add a boat → base template auto-schedules Lamination (gelcoat = TBD + freeze-by date)
2. **Sales**: Choose options & gelcoat color → app builds final BOM & picklists  
3. **Stockroom (Picklist)**: Read-only picklist grouped by Dept — NO option editing
4. **Dashboard/Timeline**: Status chips, freeze-by reminders; basic date moves for managers only

### Role-Based Access Control (RBAC)
Switch roles in the navbar dropdown:

- **Employee** (shop/stockroom): 
  - ✅ View dashboard/timeline/picklist
  - ✅ Mark lines picked/staged  
  - ❌ Cannot edit options or schedules

- **Floor Manager**: 
  - ✅ Everything above
  - ✅ Can move schedule dates (drag/drop)
  - ❌ Cannot set options/colors

- **Admin**: 
  - ✅ Everything above
  - ✅ Can set options/colors
  - ✅ Generate final BOM/picklists
  - ✅ Unlock schedules

## 📊 Data & Rules

### BOM Engine
- **Base BOM**: Items with `{ sku, name, qty, unit, dept }`
- **Options rules**: Mini-BOMs that specify ADDs and REMOVEs by SKU  
- **BOM engine rule**: `FINAL = (BASE – REMOVES) + ADDS`; fold duplicate SKUs by summing qty; group by dept

### Boats Data
- ID, customer, model, due_date, stations[], config_stage, gelcoat_color, color_freeze_by
- **Timeline stations**: Lamination → Assembly → Rigging → Finish
- **Freeze-by**: 48h before Lamination Gelcoat start (computed automatically)

## 🧪 Testing

```bash
# Run BOM engine tests
npm run test:bom

# Manual testing checklist:
# T1: When boat finalized on /sales, /picklist shows read-only list with removes applied, grouped by dept
# T2: As employee role, /sales finalize button hidden; /picklist action buttons visible
# T3: As floor_manager, can see date adjustment options in timeline
# T4: Boats with gelcoat_color=null and past freeze-by show red alert on /dashboard
# T5: BOM engine tests cover: remove-only, add-only, add+remove collision, duplicate SKU folding
```

## 📁 Project Structure

```
app/
├── contexts/RoleContext.tsx    # Role-based permission system
├── lib/
│   ├── types.ts               # TypeScript definitions
│   ├── bom-engine.ts          # BOM calculation logic (pure functions)
│   ├── bom-engine.test.ts     # BOM engine tests  
│   ├── store.ts               # In-memory data store (MVP only)
│   └── ui-kit.ts              # Consistent styling components
├── intake/page.tsx            # Add new boats
├── sales/page.tsx             # Configure options & finalize
├── picklist/page.tsx          # Stockroom read-only grouped view  
├── dashboard/page.tsx         # Status cards & freeze-by alerts
└── timeline/page.tsx          # Horizontal production timeline
```

## 🛡️ Safety & Conventions

- **Role checks**: Both in UI (show/hide) and data flow
- **No data loss**: Import-only, no spreadsheet mutation  
- **Type safety**: Full TypeScript, no `any` types
- **Accessibility**: Labeled inputs, keyboard navigation
- **Consistent UI**: Uses `ui-kit.ts` polish kit across all pages

## 📋 MVP Acceptance Tests

- ✅ **T1**: Finalized boat shows proper BOM with options applied
- ✅ **T2**: Role-based button visibility works correctly  
- ✅ **T3**: Floor managers see date adjustment options
- ✅ **T4**: Color freeze-by alerts show correctly
- ✅ **T5**: BOM engine handles all test cases (run `npm run test:bom`)

## 🔄 Next Steps

This MVP provides the core workflow. Future iterations could add:
- Database persistence (replace in-memory store)
- Real-time updates across users
- Advanced date adjustment UI
- Excel import/export functionality  
- Print-friendly picklists
- Mobile responsive improvements

## 🏗️ Architecture Notes

- **Next.js App Router** with TypeScript
- **Tailwind CSS** for styling
- **Pure function BOM engine** for testability
- **Context-based role management**
- **Component-based UI kit** for consistency

The code is structured as if API checks exist later (role verification, data validation) even though it's currently client-side only.
