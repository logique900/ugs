const fs = require('fs');
let code = fs.readFileSync('src/components/Stock.tsx', 'utf8');

const importTarget = "import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';";
const importReplacement = "import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';\nimport { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';";

code = code.replace(importTarget, importReplacement);
fs.writeFileSync('src/components/Stock.tsx', code);
