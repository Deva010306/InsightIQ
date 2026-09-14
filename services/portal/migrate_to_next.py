import os
import re
import shutil

src_dir = 'src'
app_dir = 'app'

# Create next.js app structure
os.makedirs(app_dir, exist_ok=True)

# Delete App.tsx and main.tsx as they belong to Vite
if os.path.exists(os.path.join(src_dir, 'main.tsx')):
    os.remove(os.path.join(src_dir, 'main.tsx'))
if os.path.exists(os.path.join(src_dir, 'App.tsx')):
    os.remove(os.path.join(src_dir, 'App.tsx'))
if os.path.exists('index.html'):
    os.remove('index.html')
if os.path.exists('vite.config.ts'):
    os.remove('vite.config.ts')

route_map = {
    'Login.tsx': 'login',
    'DecisionCenter.tsx': 'dashboard',
    'AIAdvisor.tsx': 'advisor',
    'Recommendations.tsx': 'recommendations',
    'Forecasting.tsx': 'forecasting',
    'Alerts.tsx': 'alerts',
    'Reports.tsx': 'reports',
    'DataSources.tsx': 'data-sources',
    'Settings.tsx': 'settings'
}

def fix_imports(content):
    # Replace react-router-dom imports
    content = re.sub(r"import\s+{(.*?)}\s+from\s+['\"]react-router-dom['\"]", 
                     r"import { useRouter, usePathname, useParams } from 'next/navigation'\nimport Link from 'next/link'", content)
    # Replace useNavigate
    content = content.replace('const navigate = useNavigate()', 'const router = useRouter()')
    content = content.replace('navigate(', 'router.push(')
    content = content.replace('navigate (', 'router.push(')
    
    # Replace `<Link to="X"` with `<Link href="X"`
    content = re.sub(r'<Link\s+to=', r'<Link href=', content)
    return content

# Migrate pages
pages_dir = os.path.join(src_dir, 'pages')
if os.path.exists(pages_dir):
    for root, dirs, files in os.walk(pages_dir):
        for file in files:
            if file.endswith('.tsx'):
                old_path = os.path.join(root, file)
                
                # Determine new route path
                rel_path = os.path.relpath(root, pages_dir)
                if rel_path == '.':
                    route_name = route_map.get(file, file.replace('.tsx', '').lower())
                else:
                    route_name = f"{rel_path.replace('\\', '/')}/{file.replace('.tsx', '').lower()}"
                
                # Handle dynamic routes like `analytics/:id`
                route_name = route_name.replace('[', '').replace(']', '')
                
                new_route_dir = os.path.join(app_dir, route_name)
                os.makedirs(new_route_dir, exist_ok=True)
                new_path = os.path.join(new_route_dir, 'page.tsx')
                
                with open(old_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                content = fix_imports(content)
                
                # Fix relative imports because depth changed
                # It moved from src/pages/File.tsx (depth 1) to app/route/page.tsx (depth 1)
                # Basically ../components becomes @/components
                content = content.replace('../components', '@/components')
                content = content.replace('../../components', '@/components')
                content = content.replace('../store', '@/store')
                content = content.replace('../../store', '@/store')
                content = content.replace('../api', '@/api')
                content = content.replace('../../api', '@/api')
                
                # Also Next.js pages must export default function
                if 'export default' not in content:
                    content = re.sub(r'export function ([A-Za-z0-9_]+)', r'export default function \1', content)
                
                with open(new_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
    # Remove old pages dir
    shutil.rmtree(pages_dir)

# Fix components
components_dir = os.path.join(src_dir, 'components')
if os.path.exists(components_dir):
    for root, dirs, files in os.walk(components_dir):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                content = fix_imports(content)
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)

# Global layout
layout_content = """import React from 'react';
import '@/index.css';
import AppShell from '@/components/layout/AppShell';

export const metadata = {
  title: 'InsightIQ',
  description: 'AI-Powered Business Intelligence',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
"""
with open(os.path.join(app_dir, 'layout.tsx'), 'w', encoding='utf-8') as f:
    f.write(layout_content)

print("Migration script completed.")
