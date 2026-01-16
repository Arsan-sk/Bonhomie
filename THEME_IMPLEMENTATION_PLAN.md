# Theme System Implementation Plan

## Overview
Implement a dynamic theme system allowing global and per-user theme customization between Blue and Indigo/Purple themes.

## Current Color Analysis

### Blue Theme (Landing Page, Login, Register)
- Primary: `hsl(221.2 83.2% 53.3%)` - Blue color
- Usage: `bg-primary`, `hover:bg-blue-600`, `text-blue-*`, `border-blue-*`

### Indigo/Purple Theme (Student & Coordinator Shells)
- Primary colors: `indigo-*` and `purple-*` variants (500, 600, 700)
- Usage: `bg-indigo-600`, `text-purple-600`, `hover:bg-indigo-700`

### Admin Theme
- Current: Mix of indigo/purple
- Will remain consistent with own theme

## Implementation Steps

### 1. Database Schema Updates
- Add `theme_color` column to `global_settings` table (default: 'blue')
- Add `theme_color` column to `profiles` table (default: NULL - inherits from global)

### 2. CSS Variables Enhancement
- Create theme-specific CSS variables
- Use CSS custom properties for dynamic theming
- Variables to create:
  - `--theme-primary`
  - `--theme-primary-hover`
  - `--theme-primary-light`
  - `--theme-primary-dark`

### 3. Theme Context
- Create `ThemeContext` to manage current theme
- Provide theme throughout app
- Load user's theme preference or fallback to global

### 4. Component Updates
Affected components:
- Landing.jsx
- Login.jsx
- Register.jsx
- All Student/* pages
- All Coordinator/* pages
- EventRegistration.jsx
- Profile pages

### 5. Admin Features
- Global Settings: Add theme selector
- User Profile: Add personal theme override

## Theme Colors

### Blue Theme
```css
--theme-50: #eff6ff
--theme-100: #dbeafe
--theme-500: #3b82f6
--theme-600: #2563eb
--theme-700: #1d4ed8
```

### Indigo/Purple Theme
```css
--theme-50: #eef2ff
--theme-100: #e0e7ff
--theme-500: #6366f1
--theme-600: #4f46e5
--theme-700: #4338ca
```

## Files to Create/Modify

### New Files
1. `src/context/ThemeContext.jsx` - Theme provider
2. `src/hooks/useTheme.js` - Theme hook
3. `supabase/add_theme_columns.sql` - Database migration

### Modified Files
1. `src/index.css` - Add theme CSS variables
2. `tailwind.config.js` - Add theme configuration
3. All component files using hardcoded colors
4. Admin Global Settings page
5. User Profile pages

## Implementation Priority

1. ✅ Database schema
2. ✅ CSS variables and Tailwind config
3. ✅ Theme Context and Provider
4. ✅ Admin Global Settings UI
5. ✅ User Profile Theme Selector
6. ✅ Update all components to use theme variables
7. ✅ Testing across all user roles
