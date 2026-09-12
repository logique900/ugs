#!/bin/bash
# Remove the stray closing brace and the new custom CSS blocks that were misplaced,
# and insert the custom CSS at the end.

cat src/index.css | sed -n '1,/--font-sans: '"'"'Plus Jakarta Sans'"'"', sans-serif;/p' > src/index_fixed.css

cat << 'INNEREOF' >> src/index_fixed.css

  --text-label-md: 13px;
  --text-label-md--line-height: 18px;
  --text-label-md--font-weight: 600;
  --text-display-lg: 36px;
  --text-display-lg--line-height: 44px;
  --text-display-lg--letter-spacing: -0.02em;
  --text-display-lg--font-weight: 700;
  --text-headline-md-mobile: 20px;
  --text-headline-md-mobile--line-height: 28px;
  --text-headline-md-mobile--font-weight: 600;
  --text-body-md: 14px;
  --text-body-md--line-height: 20px;
  --text-body-md--font-weight: 400;
  --text-headline-md: 24px;
  --text-headline-md--line-height: 32px;
  --text-headline-md--letter-spacing: -0.01em;
  --text-headline-md--font-weight: 600;
  --text-code-md: 14px;
  --text-code-md--line-height: 20px;
  --text-code-md--letter-spacing: 0.01em;
  --text-code-md--font-weight: 500;
  --text-body-lg: 16px;
  --text-body-lg--line-height: 24px;
  --text-body-lg--font-weight: 400;
  --text-headline-sm: 20px;
  --text-headline-sm--line-height: 28px;
  --text-headline-sm--font-weight: 600;
}

/* Custom Scrollbar for a premium feel */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Global Selection */
::selection {
  background: #e0e7ff;
  color: #3730a3;
}

/* Base resets */
body {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Outfit', sans-serif;
}
INNEREOF

mv src/index_fixed.css src/index.css
