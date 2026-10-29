/**
 * Part 19: Light & Dark Theme System Automated Test Suite
 *
 * Verifies:
 * 1. Design Token Specifications (Light vs Dark tokens, color-scheme, CSS variables)
 * 2. WCAG AA Contrast Ratios for Light and Dark color palettes
 * 3. Theme Persistence & Fallback Resolution Logic
 * 4. DOM ClassList & Attribute Synchronization Simulation
 * 5. Pre-Hydration Flash Prevention Script Verification in index.html
 * 6. Tailwind darkMode: 'class' and Theme Tokens Configuration
 * 7. Component-Level Theme Integration & Accessible Toggles
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let totalTests = 0;
let passedTests = 0;

const test = (description, fn) => {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ PASS: ${description}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    process.exitCode = 1;
  }
};

/**
 * Calculate sRGB relative luminance and contrast ratio according to W3C WCAG 2.1 specs
 */
function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function getLuminance([r, g, b]) {
  const a = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hexToRgb(hex1));
  const lum2 = getLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

console.log('====================================================');
console.log('🧪 Starting Part 19: Theme System Test Suite');
console.log('====================================================\n');

// --- Test Suite 1: Design Tokens & Palette Specifications ---
console.log('--- Test Suite 1: Design Tokens & Palette Specifications ---');

const cssPath = path.resolve(__dirname, '../../../client/src/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

test('CSS defines complete Light Theme design tokens in :root', () => {
  assert.ok(cssContent.includes('--bg-primary: #f8fafc'), 'Missing --bg-primary in Light Mode');
  assert.ok(cssContent.includes('--bg-card: #ffffff'), 'Missing --bg-card in Light Mode');
  assert.ok(cssContent.includes('--text-primary: #0f172a'), 'Missing --text-primary in Light Mode');
  assert.ok(cssContent.includes('--text-secondary: #334155'), 'Missing --text-secondary in Light Mode');
  assert.ok(cssContent.includes('--border-color: #e2e8f0'), 'Missing --border-color in Light Mode');
  assert.ok(cssContent.includes('color-scheme: light'), 'Missing color-scheme: light');
});

test('CSS defines complete Dark Theme design tokens in html.dark / [data-theme="dark"]', () => {
  assert.ok(cssContent.includes('--bg-primary: #090d16'), 'Missing --bg-primary in Dark Mode');
  assert.ok(cssContent.includes('--bg-card: #0f172a'), 'Missing --bg-card in Dark Mode');
  assert.ok(cssContent.includes('--text-primary: #f8fafc'), 'Missing --text-primary in Dark Mode');
  assert.ok(cssContent.includes('--text-secondary: #94a3b8'), 'Missing --text-secondary in Dark Mode');
  assert.ok(cssContent.includes('--border-color: #1e293b'), 'Missing --border-color in Dark Mode');
  assert.ok(cssContent.includes('color-scheme: dark'), 'Missing color-scheme: dark');
});

test('CSS body applies background-color and color using theme variables', () => {
  assert.ok(cssContent.includes('background-color: var(--bg-primary);'), 'body missing var(--bg-primary)');
  assert.ok(cssContent.includes('color: var(--text-primary);'), 'body missing var(--text-primary)');
});

test('.card-surface utility class binds directly to theme variables', () => {
  assert.ok(cssContent.includes('background-color: var(--bg-card);'), '.card-surface missing var(--bg-card)');
  assert.ok(cssContent.includes('border: 1px solid var(--border-color);'), '.card-surface missing var(--border-color)');
});

// --- Test Suite 2: WCAG 2.1 AA Contrast Ratio Verification ---
console.log('\n--- Test Suite 2: WCAG 2.1 AA Contrast Ratio Verification ---');

test('Light Theme: Primary Text (#0f172a) on Card Background (#ffffff) exceeds WCAG AAA (7:1)', () => {
  const ratio = getContrastRatio('#0f172a', '#ffffff');
  assert.ok(ratio >= 7.0, `Contrast ratio ${ratio.toFixed(2)} is less than 7.0:1`);
});

test('Light Theme: Secondary Text (#334155) on Background (#f8fafc) exceeds WCAG AA (4.5:1)', () => {
  const ratio = getContrastRatio('#334155', '#f8fafc');
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio.toFixed(2)} is less than 4.5:1`);
});

test('Dark Theme: Primary Text (#f8fafc) on Dark Card (#0f172a) exceeds WCAG AAA (7:1)', () => {
  const ratio = getContrastRatio('#f8fafc', '#0f172a');
  assert.ok(ratio >= 7.0, `Contrast ratio ${ratio.toFixed(2)} is less than 7.0:1`);
});

test('Dark Theme: Secondary Text (#94a3b8) on Dark Background (#090d16) exceeds WCAG AA (4.5:1)', () => {
  const ratio = getContrastRatio('#94a3b8', '#090d16');
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio.toFixed(2)} is less than 4.5:1`);
});

test('Brand Primary Button: White Text (#ffffff) on Blue (#2563eb) satisfies accessible ratio (4.5:1)', () => {
  const ratio = getContrastRatio('#ffffff', '#2563eb');
  assert.ok(ratio >= 4.5, `Contrast ratio ${ratio.toFixed(2)} is less than 4.5:1`);
});

// --- Test Suite 3: Theme Persistence & Resolution Logic ---
console.log('\n--- Test Suite 3: Theme Persistence & Resolution Logic ---');

function simulateResolveTheme(mockStorageVal, systemPrefersDark) {
  if (mockStorageVal === 'light' || mockStorageVal === 'dark') {
    return mockStorageVal;
  }
  return systemPrefersDark ? 'dark' : 'light';
}

test('Resolves to stored theme when valid preference exists in localStorage', () => {
  assert.strictEqual(simulateResolveTheme('light', true), 'light');
  assert.strictEqual(simulateResolveTheme('dark', false), 'dark');
});

test('Falls back to system preference (dark) when localStorage is empty', () => {
  assert.strictEqual(simulateResolveTheme(null, true), 'dark');
  assert.strictEqual(simulateResolveTheme(undefined, true), 'dark');
});

test('Falls back to system preference (light) when localStorage is empty and system is light', () => {
  assert.strictEqual(simulateResolveTheme(null, false), 'light');
});

test('Safely handles corrupted or unknown values in localStorage', () => {
  assert.strictEqual(simulateResolveTheme('invalid_theme_name', true), 'dark');
  assert.strictEqual(simulateResolveTheme('invalid_theme_name', false), 'light');
});

// --- Test Suite 4: DOM Synchronization & State Transitions ---
console.log('\n--- Test Suite 4: DOM Synchronization & State Transitions ---');

class MockDOMElement {
  constructor() {
    this.classList = new Set();
    this.attributes = {};
    this.style = {};
  }
  setAttribute(k, v) {
    this.attributes[k] = v;
  }
}

function simulateApplyTheme(root, theme) {
  const isDark = theme === 'dark';
  if (isDark) {
    root.classList.add('dark');
    root.classList.delete('light');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.delete('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
}

test('Applying "dark" adds dark class, removes light class, and sets data-theme="dark"', () => {
  const mockRoot = new MockDOMElement();
  mockRoot.classList.add('light');

  simulateApplyTheme(mockRoot, 'dark');

  assert.ok(mockRoot.classList.has('dark'), 'Missing dark class');
  assert.ok(!mockRoot.classList.has('light'), 'Light class was not removed');
  assert.strictEqual(mockRoot.attributes['data-theme'], 'dark');
  assert.strictEqual(mockRoot.style.colorScheme, 'dark');
});

test('Applying "light" adds light class, removes dark class, and sets data-theme="light"', () => {
  const mockRoot = new MockDOMElement();
  mockRoot.classList.add('dark');

  simulateApplyTheme(mockRoot, 'light');

  assert.ok(mockRoot.classList.has('light'), 'Missing light class');
  assert.ok(!mockRoot.classList.has('dark'), 'Dark class was not removed');
  assert.strictEqual(mockRoot.attributes['data-theme'], 'light');
  assert.strictEqual(mockRoot.style.colorScheme, 'light');
});

test('Toggle function switches cleanly between dark and light', () => {
  let theme = 'dark';
  const toggle = (current) => (current === 'dark' ? 'light' : 'dark');

  theme = toggle(theme);
  assert.strictEqual(theme, 'light');
  theme = toggle(theme);
  assert.strictEqual(theme, 'dark');
});

// --- Test Suite 5: Pre-Hydration Flash Prevention in index.html ---
console.log('\n--- Test Suite 5: Pre-Hydration Flash Prevention in index.html ---');

const htmlPath = path.resolve(__dirname, '../../../client/index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

test('index.html contains inline pre-hydration script in head', () => {
  assert.ok(htmlContent.includes('<script>'), 'Missing <script> tag in head');
  assert.ok(htmlContent.includes("localStorage.getItem('theme')"), 'Script must check localStorage');
  assert.ok(htmlContent.includes('matchMedia'), 'Script must support prefers-color-scheme media query');
  assert.ok(htmlContent.includes('document.documentElement.classList.add'), 'Script must mutate classList before body renders');
});

// --- Test Suite 6: Tailwind Configuration & Theme Extension ---
console.log('\n--- Test Suite 6: Tailwind Configuration & Theme Extension ---');

const tailwindPath = path.resolve(__dirname, '../../../client/tailwind.config.js');
const tailwindContent = fs.readFileSync(tailwindPath, 'utf8');

test("tailwind.config.js enables darkMode: 'class'", () => {
  assert.ok(tailwindContent.includes("darkMode: 'class'"), "Tailwind must have darkMode: 'class'");
});

test('tailwind.config.js maps theme tokens to CSS variables', () => {
  assert.ok(tailwindContent.includes('var(--bg-primary)'), 'Missing var(--bg-primary) mapping');
  assert.ok(tailwindContent.includes('var(--bg-card)'), 'Missing var(--bg-card) mapping');
  assert.ok(tailwindContent.includes('var(--text-primary)'), 'Missing var(--text-primary) mapping');
  assert.ok(tailwindContent.includes('var(--border-color)'), 'Missing var(--border-color) mapping');
});

// --- Test Suite 7: Component Coverage & Accessible Theme Toggle ---
console.log('\n--- Test Suite 7: Component Coverage & Accessible Theme Toggle ---');

const togglePath = path.resolve(__dirname, '../../../client/src/components/common/ThemeToggle.jsx');
const toggleContent = fs.readFileSync(togglePath, 'utf8');

test('ThemeToggle component renders Sun and Moon icons with accessible aria labels', () => {
  assert.ok(toggleContent.includes('Sun'), 'Missing Sun icon');
  assert.ok(toggleContent.includes('Moon'), 'Missing Moon icon');
  assert.ok(toggleContent.includes('aria-label'), 'Missing accessible aria-label');
  assert.ok(toggleContent.includes('aria-pressed'), 'Missing aria-pressed state');
});

const navbarPath = path.resolve(__dirname, '../../../client/src/components/navigation/Navbar.jsx');
const navbarContent = fs.readFileSync(navbarPath, 'utf8');

test('Navbar integrates ThemeToggle on both desktop and mobile layouts', () => {
  assert.ok(navbarContent.includes('import ThemeToggle from'), 'Navbar must import ThemeToggle');
  assert.ok(navbarContent.includes('<ThemeToggle'), 'Navbar must render ThemeToggle');
  assert.ok(navbarContent.includes('Display Theme'), 'Mobile drawer must include Theme label');
});

const appPath = path.resolve(__dirname, '../../../client/src/App.jsx');
const appContent = fs.readFileSync(appPath, 'utf8');

test('App.jsx wraps application root in ThemeProvider', () => {
  assert.ok(appContent.includes('import { ThemeProvider }'), 'App.jsx must import ThemeProvider');
  assert.ok(appContent.includes('<ThemeProvider>'), 'App.jsx must wrap root in <ThemeProvider>');
});

console.log('\n====================================================');
console.log(`Theme System Test Summary: Passed: ${passedTests}/${totalTests}, Failed: ${totalTests - passedTests}`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
