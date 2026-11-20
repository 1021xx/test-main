// The homepage is a saved Next.js build. These two small export adapters let
// it render the same shared HTML as new pages while retaining its existing
// feature tabs, charts and animations. Original saved assets stay untouched.
const adapters = {
  'assets/db9a404a10f536ca5f7d': {
    marker: 'r.d(t,{Navbar:()=>S});',
    replacement: 'r.d(t,{Navbar:()=>AgencySharedHeader});function AgencySharedHeader(){const theme=r(31048).D();r(30423).useEffect(()=>{const sync=event=>theme.setTheme(event.detail);window.addEventListener("agency-theme-change",sync);window.dispatchEvent(new Event("agency-header-mounted"));return()=>window.removeEventListener("agency-theme-change",sync)},[theme.setTheme]);return r(30423).useMemo(()=>r(80159).jsx("header",{className:"agency-site-header",dangerouslySetInnerHTML:{__html:window.__AGENCY_COMMON__.header}}),[])}'
  },
  'assets/2d92301221c9de20daa0': {
    marker: 'r.d(t,{FooterSection:()=>x});',
    replacement: 'r.d(t,{FooterSection:()=>AgencySharedFooter});function AgencySharedFooter(){r(30423).useEffect(()=>{window.dispatchEvent(new Event("agency-footer-mounted"))},[]);return r(30423).useMemo(()=>r(80159).jsx("footer",{id:"footer",className:"w-full pb-0 agency-site-footer",dangerouslySetInnerHTML:{__html:window.__AGENCY_COMMON__.footer}}),[])}'
  }
};

function adaptHomeAsset(file, source) {
    if (file.replaceAll('\\', '/') === 'assets/e35400fc30c2c456d75e') {
    return source.replaceAll('text:"도입문의",href:"#"', 'text:"도입문의",href:"/inquiry"')
      .replaceAll('text:"원격지원",href:"#"', 'text:"원격지원",href:"https://113366.com/agencypro"');
  }
  const adapter = adapters[file.replaceAll('\\', '/')];
  if (!adapter) return source;
  if (source.split(adapter.marker).length !== 2) {
    throw new Error(`Saved homepage changed: update shared layout adapter for ${file}`);
  }
  return source.replace(adapter.marker, adapter.replacement);
}

module.exports = { adaptHomeAsset, adaptedFiles: [...Object.keys(adapters), "assets/e35400fc30c2c456d75e"] };
