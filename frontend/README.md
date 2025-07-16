# Vega.ai Frontend - React + Vite

This is the frontend application for Vega.ai, built with React and Vite. It provides a modern, responsive user interface for the AI-powered educational assistant.

## 🏗️ Architecture Overview

The frontend follows a modular architecture with clear separation of concerns:

### Project Structure
```
src/
├── components/     # Reusable UI components
├── pages/         # Main application pages
├── utils/         # Utility functions and helpers
├── assets/        # Static assets (images, icons)
├── main.jsx       # Application entry point
├── App.jsx        # Main application component
└── mainLayout.css # Global styles, fonts, and animations
```

## 📁 Directory Guidelines

### Components (`src/components/`)
Reusable UI components that can be used across multiple pages.

**Naming Convention:** 
- Component files: `ComponentName.jsx` (PascalCase)
- Style files: `componentNameLayout.css` (camelCase + "Layout")

**Current Components:**
- `avatar.jsx` + `avatarLayout.css` - User avatar display
- `ChatSuggestions.jsx` + `chatSuggestionsLayout.css` - Chat suggestion system
- `sidebar.jsx` + `sideBarLayout.css` - Navigation sidebar
- `topBar.jsx` + `topBarLayout.css` - Top navigation bar
- `UserManagement.jsx` + `userManagement.css` - User management interface
- `voicetotext.jsx` + `voiceToTextLayout.css` - Voice input component

### Pages (`src/pages/`)
Main application pages that represent different routes/views.

**Naming Convention:**
- Page files: `PageName.jsx` (PascalCase)
- Style files: `pageNameLayout.css` (camelCase + "Layout")

**Current Pages:**
- `HomePage.jsx` + `homeLayout.css` - Landing/home page
- `ChatPage.jsx` + `chatPageLayout.css` - Main chat interface
- `LoginPage.jsx` + `LoginLayout.css` - User authentication
- `ServicesPage.jsx` - Services overview
- `SettingsPage.jsx` + `SettingsLayout.css` - User settings

### Utils (`src/utils/`)
Utility functions, API helpers, and shared logic.

**Current Utils:**
- `auth.js` - Authentication utilities
- `authComponents.jsx` - Authentication-related components

## 🎨 Styling Guidelines

### Global Styles (`src/mainLayout.css`)
**ALL animations, fonts, and global styles MUST be declared in `mainLayout.css`.**

#### Font Declarations
All custom fonts are imported in `mainLayout.css`:
```css
/* Example font import structure */
@font-face {
  font-family: 'FontName';
  src: url('/fonts/FontFile.otf') format('opentype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

**Available Fonts:**
- `Expansiva` - Main heading font
- `ExpansivaBold` - Bold variant
- `ExpansivaBoldItalic` - Bold italic variant
- `Orbitron` - Secondary font (light)
- `OrbitronBold` - Secondary font (bold)

#### Animation Declarations
All keyframe animations and transitions should be defined in `mainLayout.css`:
```css
/* Example animation structure */
@keyframes animationName {
  0% { /* initial state */ }
  100% { /* final state */ }
}

.animated-element {
  animation: animationName 0.3s ease-in-out;
}
```

#### CSS Variables
Global CSS variables are defined in `:root` within `mainLayout.css`:
```css
:root {
  --primary-color: #your-color;
  --secondary-color: #your-color;
  --font-primary: 'Expansiva', sans-serif;
}
```

### Component-Specific Styles
Each component should have its own CSS file following the naming convention:
- Use `componentNameLayout.css` for styling
- Import only component-specific styles
- Use CSS modules or scoped styles to avoid conflicts
- Reference global variables from `mainLayout.css`

## 🚀 Development Setup

### Prerequisites
- Node.js 16+ (recommended: 18+)
- npm or yarn package manager

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Environment Variables
Create a `.env` file in the frontend directory:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Vega.ai
VITE_ENABLE_VOICE_INPUT=true
VITE_ENABLE_DARK_MODE=true
VITE_DEBUG=true
```

## 📝 Coding Standards

### File Naming
- **Components:** `ComponentName.jsx` (PascalCase)
- **Pages:** `PageName.jsx` (PascalCase)
- **Utilities:** `utilityName.js` (camelCase)
- **Styles:** `fileNameLayout.css` (camelCase + "Layout")

### Component Structure
```jsx
// ComponentName.jsx
import React from 'react';
import './componentNameLayout.css';

const ComponentName = ({ prop1, prop2 }) => {
  return (
    <div className="component-container">
      {/* Component content */}
    </div>
  );
};

export default ComponentName;
```

### CSS Class Naming
- Use kebab-case for CSS classes: `.component-name`
- Use BEM methodology when appropriate: `.block__element--modifier`
- Prefix component-specific classes to avoid conflicts

## 🎯 Component Guidelines

### Creating New Components
1. Create `ComponentName.jsx` in `src/components/`
2. Create `componentNameLayout.css` for styles
3. Add any animations to `mainLayout.css`
4. Import and use in parent components
5. Document props and usage

### Creating New Pages
1. Create `PageName.jsx` in `src/pages/`
2. Create `pageNameLayout.css` for page-specific styles
3. Add route configuration in `App.jsx`
4. Ensure responsive design
5. Add proper navigation handling

### Best Practices
- Use functional components with hooks
- Implement proper prop validation
- Follow responsive design principles
- Optimize for performance (lazy loading, memoization)
- Maintain accessibility standards
- Use semantic HTML elements

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically

# Testing (when implemented)
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

## 📱 Responsive Design

### Breakpoints
Ensure all components work across different screen sizes:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile-First Approach
Write CSS mobile-first, then enhance for larger screens:
```css
/* Mobile styles (default) */
.component {
  width: 100%;
}

/* Tablet and up */
@media (min-width: 768px) {
  .component {
    width: 80%;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .component {
    width: 60%;
  }
}
```

## 🎨 Asset Management

### Images and Icons
- Store in `public/` directory
- Use appropriate formats (PNG, SVG, WebP)
- Optimize for web delivery
- Use descriptive filenames

### Fonts
- Store custom fonts in `public/fonts/`
- Declare all fonts in `mainLayout.css`
- Use `font-display: swap` for better loading

## 🔍 Troubleshooting

### Common Issues
1. **Styles not applying:**
   - Check if CSS file is imported correctly
   - Verify class names match between JSX and CSS
   - Ensure no CSS conflicts

2. **Fonts not loading:**
   - Verify font files are in `public/fonts/`
   - Check font declarations in `mainLayout.css`
   - Ensure correct font family names

3. **Build errors:**
   - Clear `node_modules` and reinstall
   - Check for syntax errors in JSX
   - Verify all imports are correct

4. **Hot reload issues:**
   - Restart development server
   - Clear browser cache
   - Check for circular dependencies

## 🤝 Contributing

1. Follow the established naming conventions
2. Add styles to appropriate CSS files
3. Update this README when adding new patterns
4. Test across different screen sizes
5. Ensure accessibility compliance

## 📚 Additional Resources

- [React Documentation](https://reactjs.org/docs)
- [Vite Documentation](https://vitejs.dev/guide/)
- [CSS Best Practices](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
