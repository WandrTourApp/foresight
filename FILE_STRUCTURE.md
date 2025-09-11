# Barker Foresight App - File Structure & Summary

## Project Overview
A comprehensive boat production management system built with Next.js, TypeScript, and React. The application manages the entire production lifecycle from sales to delivery, with role-based access control and real-time tracking.

## Directory Structure

```
barker-foresight-app/
├── .claude/                      # Claude AI configuration
│   └── settings.local.json       # Local Claude settings
├── .next/                        # Next.js build output (auto-generated)
├── app/                          # Main application directory
│   ├── api/                      # API routes
│   │   └── schedule/
│   │       └── route.ts          # Schedule API endpoint for saving/loading schedule data
│   ├── assembly/                 # Assembly department module
│   │   └── page.tsx              # Assembly scheduling page
│   ├── bom/                      # Bill of Materials module
│   │   └── page.tsx              # BOM management page
│   ├── components/               # React components
│   │   ├── bom/                  # BOM-related components
│   │   │   ├── engine.ts         # BOM calculation engine
│   │   │   └── engine.test.ts    # BOM engine tests
│   │   ├── boat-parts-tracker.tsx              # Comprehensive boat production tracking with 5-status fiberglass system
│   │   ├── customer-printables-panel.tsx       # Customer documentation generation
│   │   ├── custom-options-review.tsx           # Custom options review interface
│   │   ├── foresight-assembly-module.tsx       # Assembly department management
│   │   ├── foresight-bom-picker.tsx            # Bill of materials selection
│   │   ├── foresight-customer-module.tsx       # Customer management interface
│   │   ├── foresight-finishing-module.tsx      # Finishing department management
│   │   ├── foresight-improved-bom-picker.tsx   # Enhanced BOM picker
│   │   ├── foresight-interactive-gantt.tsx     # Interactive Gantt chart with drag-and-drop scheduling
│   │   ├── foresight-lamination-module.tsx     # Lamination department management
│   │   ├── foresight-production-dashboard.tsx  # Production dashboard with real-time status overview
│   │   ├── foresight-production-timeline-v2.tsx # In-app production timeline with department views
│   │   ├── foresight-rigging-module.tsx        # Rigging department management
│   │   ├── foresight-sales-options.tsx         # Sales options configuration
│   │   ├── foresight-timeline-dashboard.tsx    # Timeline dashboard view
│   │   ├── foresight-unified-schedules.tsx     # Unified scheduling interface for all departments
│   │   ├── mode-context.tsx                    # Mode context provider
│   │   ├── Navbar.tsx                          # Role-based navigation component
│   │   ├── production-scheduler.tsx            # Automated production scheduling with optimization
│   │   ├── role-context.tsx                    # Role context provider
│   │   ├── schedules-hub.tsx                   # Tab-based scheduling navigation hub
│   │   ├── store.ts                            # Component state management
│   │   └── use-active-boat.ts                  # Active boat selection hook
│   ├── config/                   # Configuration files
│   │   └── schedule-map.ts       # Schedule mapping configuration
│   ├── contexts/                 # React contexts
│   │   └── RoleContext.tsx       # Role-based access control context
│   ├── custom-options/           # Custom options module
│   │   └── page.tsx              # Custom options management page
│   ├── dashboard/                # Dashboard module
│   │   └── page.tsx              # Main dashboard page
│   ├── finishing/                # Finishing department module
│   │   └── page.tsx              # Finishing scheduling page
│   ├── intake/                   # Intake module
│   │   └── page.tsx              # Boat intake page
│   ├── lamination/               # Lamination department module
│   │   └── page.tsx              # Lamination scheduling page
│   ├── lib/                      # Utility libraries
│   │   ├── boat-tracker-utils.ts      # Boat tracking utilities
│   │   ├── bom-engine.ts              # BOM calculation engine
│   │   ├── bom-engine.test.ts         # BOM engine tests
│   │   ├── build-utils.ts             # Build-related utilities
│   │   ├── dept-schedule-utils.ts     # Department scheduling utilities
│   │   ├── gelcoat-utils.ts           # Gelcoat calculation utilities
│   │   ├── schedule-store.tsx         # Schedule state management
│   │   ├── schedule-types.ts          # TypeScript type definitions for schedules
│   │   ├── schedule-xlsx.ts           # Excel schedule import/export
│   │   ├── store.ts                   # Global state management
│   │   ├── types.ts                   # General TypeScript types
│   │   └── ui-kit.ts                  # UI component library
│   ├── picklist/                 # Picklist module
│   │   └── page.tsx              # Parts picklist page
│   ├── rigging/                  # Rigging department module
│   │   └── page.tsx              # Rigging scheduling page
│   ├── sales/                    # Sales module
│   │   ├── options/
│   │   │   └── page.tsx          # Sales options configuration
│   │   └── page.tsx              # Main sales page
│   ├── scheduler/                # Scheduler module
│   │   └── page.tsx              # Production scheduler page
│   ├── schedules/                # Schedules module
│   │   └── page.tsx              # All schedules overview page
│   ├── timeline/                 # Timeline module (v1)
│   │   └── page.tsx              # Timeline view page
│   ├── timeline-v2/              # Timeline module (v2)
│   │   └── page.tsx              # Enhanced timeline view
│   ├── tracker/                  # Tracker module
│   │   └── page.tsx              # Boat tracking page
│   ├── favicon.ico               # Application favicon
│   ├── globals.css               # Global CSS styles
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Home page
├── data/                         # Data files
│   └── production_schedule.xlsx # Production schedule Excel file
├── node_modules/                 # NPM dependencies (auto-generated)
├── public/                       # Public static assets
├── scripts/                      # Utility scripts
│   └── kill-port-3001.cmd       # Windows script to kill port 3001
├── .env.local                    # Local environment variables
├── .gitignore                    # Git ignore configuration
├── DESIGN_NOTES.md               # Design documentation
├── eslint.config.mjs             # ESLint configuration
├── mobile-url.txt                # Mobile access URL
├── next.config.ts                # Next.js configuration
├── next-env.d.ts                 # Next.js TypeScript definitions
├── package.json                  # NPM package configuration
├── package-lock.json             # NPM dependency lock file
├── postcss.config.mjs            # PostCSS configuration
├── README.md                     # Project documentation
├── run.sh                        # Unix run script
├── test-foresight-features.sh    # Feature testing script
├── tsconfig.json                 # TypeScript configuration
└── tsconfig.tsbuildinfo          # TypeScript build info
```

## Key Features

### Production Management
- **Boat Tracker**: Comprehensive tracking system with 5-status fiberglass parts management
- **Timeline Views**: Multiple timeline implementations for production visualization
- **Interactive Gantt Chart**: Drag-and-drop scheduling with multi-select operations
- **Department Modules**: Separate modules for Lamination, Assembly, Finishing, and Rigging

### Scheduling System
- **Unified Scheduler**: Centralized scheduling interface for all departments
- **Automated Scheduling**: Intelligent production scheduling with capacity planning
- **In-App Schedule Management**: Real-time schedule updates without Excel dependency

### Business Operations
- **Sales Module**: Customer and order management
- **BOM Management**: Bill of materials calculation and tracking
- **Custom Options**: Configuration and review of custom boat options
- **Parts Tracking**: Detailed parts inventory and status tracking

### Technical Features
- **Role-Based Access Control**: Configurable permissions per user role
- **State Management**: Centralized state using custom stores
- **Excel Integration**: Import/export capabilities with production schedules
- **API Routes**: RESTful endpoints for schedule data persistence

## Technology Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **UI**: React with Tailwind CSS
- **State Management**: Custom store implementation
- **Data**: Excel integration, local storage, API persistence
- **Build Tools**: PostCSS, ESLint
- **Testing**: Test scripts for features and BOM engine

## Development Notes
- The application uses a feature-based folder structure within the `app` directory
- Components are organized by functionality with clear separation of concerns
- Multiple timeline implementations (v1 and v2) show iterative development
- Strong emphasis on role-based access and department-specific workflows