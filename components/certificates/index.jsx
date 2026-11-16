import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Folder from './Folder';
import './certificates.css';

const items = [
  { image: '/company/assets/intro_certi01.png', title: '품질경영체제 인증서 · 국문' },
  { image: '/company/assets/intro_certi02.png', title: '품질경영체제 인증서 · 영문' },
  { image: '/company/assets/intro_certi03.png', title: '정보보호경영시스템 인증서 · 국문' },
  { image: '/company/assets/intro_certi04.png', title: '정보보호경영시스템 인증서 · 영문' },
  { image: '/company/assets/intro_certi05.png', title: '기업부설연구소 인증서 · 국문' }
];

function Certificates() {
  const host = useRef(null);
  const [size, setSize] = useState(1.3);
  const [compact, setCompact] = useState(false);
  const [theme, setTheme] = useState(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const mobile = width <= 640;
      setCompact(mobile);
      setSize(mobile ? Math.min(1.2, Math.max(.65, (width - 24) / 250)) : Math.min(1.3, Math.max(.45, (width - 32) / 800)));
    });
    observer.observe(host.current);
    const themeObserver = new MutationObserver(() => setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { observer.disconnect(); themeObserver.disconnect(); };
  }, []);
  return <div ref={host} className="agency-certificates-interactive">
    <div className="agency-certificates-stage" style={{ minHeight: 386 }}>
      <Folder label="기업 인증서" items={items.map(item => ({ title: item.title, content: <div className="agency-certificate-document"><div className="agency-certificate-document-heading"><strong>{item.title.split(' · ')[0]}</strong><span>{item.title.split(' · ')[1]}</span></div><img src={item.image} alt={item.title} draggable={false} /></div> }))} layout={compact ? 'compact' : 'spread'} mode="flap" variant="solid" color="#c5c7cb" tilt={0} theme={theme} size={size} openOn="click" peek={true} zoomOnClick={true} draggable={false} />
    </div>
    <p className="agency-certificates-hint">폴더를 클릭해 펼친 뒤, 인증서를 클릭하면 크게 볼 수 있습니다.</p>
  </div>;
}

const mount = document.getElementById('agency-certificates-root');
if (mount) createRoot(mount).render(<Certificates />);
