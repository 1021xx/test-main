# Certificates Folder

Folder.jsx and Folder.css originate from the JS-CSS registry source from https://reactbits.dev/r/Folder-JS-CSS.json (retrieved 2026-11-16). The registry lists no additional dependencies. React and React DOM provide the runtime; esbuild bundles this isolated component into the existing static site.

Run npm install, then npm run build:certificates after editing source files. Restart node server.cjs after changing asset registrations in manifest.json.

Flow: rest → hover peek → click folder to spread → click document to zoom in place. Click the selected document again or press Escape to dismiss zoom. No image links or new tabs.

Local adjustments: taller certificate pages, wider spread, and pointer tracking disabled when tilt is zero. Certificate titles and languages are rendered in the top-left via custom content.
