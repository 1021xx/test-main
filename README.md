# AgencyPRO 홈페이지 미리보기

[GitHub Pages에서 미리보기 열기](https://1021xx.github.io/test-main/)

`node server.cjs`를 실행하거나 `start.cmd`를 더블클릭한 뒤 http://127.0.0.1:4186 에 접속합니다.
별도 설치나 빌드 없이 Node.js로 실행합니다. 로컬 미리보기용 서버입니다.

## 페이지

| 경로 | 본문 파일 |
| --- | --- |
| `/` | 기존 `index.html` (메인 화면 및 애니메이션) |
| `/company` | `pages/company.html` |
| `/gaia` | `pages/gaia.html` |
| `/ezcms` | `pages/ezcms.html` |
| `/garpa` | `pages/garpa.html` |
| `/ezpaper` | `pages/ezpaper.html` |
| `/inquiry` | `pages/inquiry.html` |

메뉴 이름·순서·경로·본문 파일은 `pages/pages.json`에서 관리합니다.

## 공통 영역

- `shared/header.html`: 메인과 모든 서브페이지의 헤더. PC·모바일 메뉴는 페이지 설정에서 생성합니다.
- `shared/footer.html`: 메인과 모든 서브페이지의 회사 정보·푸터 링크.
- `shared/layout.html`: 서브페이지 전체 레이아웃.
- `shared/cta.html`: 서브페이지 하단 도입문의 배너. 메인의 기존 배너는 기존 빌드가 관리합니다.
- `shared/site.css`: 공통 너비, 여백, 헤더, 타이틀, 섹션, 카드, 버튼, 반응형 스타일.
- `shared/site.js`, `shared/theme.js`: 모바일 메뉴, 테마 저장·동기화, 스크롤 헤더, 도입문의 이동.
- `lib/site.cjs`: 공통 템플릿과 페이지 렌더링. 템플릿 수정은 새로고침으로 반영됩니다.

본문에서 `.agency-container`, `.agency-section`, `.agency-section-title`, `.agency-section-description`,
`.agency-grid`, `.agency-card`, `.agency-button`을 재사용할 수 있습니다.

## 기존 메인과 연결 방식

원본 `index.html`, `assets/`, `manifest.json`은 그대로 유지합니다.
서버는 메인 응답의 헤더·푸터를 공통 템플릿으로 바꾸고, `lib/legacy-home.cjs`에서
저장된 Next.js Navbar·FooterSection 내보내기 두 곳을 공통 HTML로 연결합니다.
기존 메인의 기능 탭, 차트, 애니메이션은 계속 기존 빌드를 사용합니다.
추후 원본 React/Next 소스를 확보하면 이 어댑터를 제거하고 정식 컴포넌트로 옮길 수 있습니다.

로컬 미리보기에서 `WEB3FORMS_ACCESS_KEY` 환경 변수를 설정하면 도입문의 양식을 사용할 수 있습니다. GitHub Pages에는 양식과 고객상담센터 연락처가 표시되며, 문의는 전화로 접수합니다.

## 공개 미리보기 업데이트

원본 HTML이나 이미지, 스타일을 수정한 뒤 프로젝트 폴더에서 `node build-pages.cjs`를 실행해 `docs/`를 갱신하세요. 원본 변경과 갱신된 `docs/`를 함께 커밋해 `main`에 푸시하면 GitHub Pages가 다시 배포합니다.

`components/certificates/`를 수정한 경우 `npm ci`와 `npm run build:certificates`로 인증서 번들을 먼저 갱신한 뒤 `node build-pages.cjs`를 실행하세요.

배포 원본은 `main` 브랜치의 `/docs` 폴더입니다.
