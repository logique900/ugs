#!/bin/bash
sed -i '/<label className="block text-xs font-bold text-on-surface-variant mb-1.5">Code Article \*<\/label>/i \
                    {formData.code && (\n                      <div className="mb-4 flex justify-center bg-white p-2 rounded-xl border border-outline-variant">\n                        <Barcode value={formData.code} width={1.5} height={40} displayValue={false} />\n                      </div>\n                    )}' src/components/Articles.tsx
