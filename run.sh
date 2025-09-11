#!/usr/bin/env bash
set -e

mkdir -p app/tracker

cat > app/tracker/page.tsx << 'EOF'
'use client';

import BoatPartsTracker from '../components/boat-parts-tracker';

export default function TrackerPage() {
  return (
    <main>
      <BoatPartsTracker />
    </main>
  );
}
EOF

cat > app/components/Navbar.tsx << 'EOF'
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-sky-700 text-white p-4 mb-6 shadow-md">
      <div className="max-w-7xl mx-auto flex gap-6 items-center">
        <h1 className="font-bold text-xl">Foresight App</h1>
        <Link href="/" className="hover:text-sky-200 transition-colors">
          Customer Intake
        </Link>
        <Link href="/lamination" className="hover:text-sky-200 transition-colors">
          Lamination Schedule
        </Link>
        <Link href="/bom" className="hover:text-sky-200 transition-colors">
          BOM Picker
        </Link>
        <Link href="/dashboard" className="hover:text-sky-200 transition-colors">
          Production Dashboard
        </Link>
        <Link href="/timeline" className="hover:text-sky-200 transition-colors">
          Production Timeline
        </Link>
        <Link href="/tracker" className="hover:text-sky-200 transition-colors">
          Parts Tracker
        </Link>
      </div>
    </nav>
  );
}
EOF

echo "✅ Boat Parts Tracker page added and navigation is complete."