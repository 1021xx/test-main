# AgencyPRO 홈페이지 미리보기

[GitHub Pages에서 미리보기 열기](https://1021xx.github.io/test-main/)

## 로컬에서 실행

Node.js가 설치된 환경에서 프로젝트 폴더를 열고 `node server.cjs`를 실행한 뒤 [로컬 미리보기](http://127.0.0.1:4186)에 접속하세요. Windows에서는 `start.cmd`를 더블클릭해도 됩니다.

HTML과 브라우저용 정적 자산으로 구성된 미리보기 프로젝트입니다. 별도 백엔드 서비스는 포함되어 있지 않습니다.

## 공개 미리보기 업데이트

원본 HTML이나 이미지, 스타일을 수정한 뒤 프로젝트 폴더에서 `node build-pages.cjs`를 실행해 `docs/`를 갱신하세요. 원본 변경과 갱신된 `docs/`를 함께 커밋해 `main`에 푸시하면 GitHub Pages가 다시 배포합니다.

배포 원본은 `main` 브랜치의 `/docs` 폴더입니다.
