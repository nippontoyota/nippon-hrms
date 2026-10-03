const fs = require('fs');

// 1. Patch layout.tsx
let layoutFile = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/app/(dashboard)/layout.tsx';
let layoutCode = fs.readFileSync(layoutFile, 'utf8');
layoutCode = layoutCode.replace('md:ml-72', 'md:ml-60');
fs.writeFileSync(layoutFile, layoutCode);

// 2. Patch sidebar.tsx
let sidebarFile = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/layout/sidebar.tsx';
let sidebarCode = fs.readFileSync(sidebarFile, 'utf8');
sidebarCode = sidebarCode.replace('w-72', 'w-60');
sidebarCode = sidebarCode.replace("  { title: 'Transfers', href: '/transfers', icon: ArrowRightLeft, section: 'Maintenance', roles: ['ADMIN', 'BRANCH'] },\n", "");
fs.writeFileSync(sidebarFile, sidebarCode);

// 3. Patch bottom-nav.tsx
let bottomNavFile = '/Users/shivasajay/Desktop/nippon-hrms/apps/maintenance/components/layout/bottom-nav.tsx';
let bottomNavCode = fs.readFileSync(bottomNavFile, 'utf8');
bottomNavCode = bottomNavCode.replace("  { title: 'Transfers', href: '/transfers', icon: ArrowRightLeft },\n", "");
fs.writeFileSync(bottomNavFile, bottomNavCode);

