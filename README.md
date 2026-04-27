# Worklog

로컬 전용 데스크탑 업무 로그 앱 프로젝트입니다.  
월간 캘린더에서 날짜를 선택해 Markdown 로그를 작성하고, 저장 시 Git 커밋/푸시까지 자동화하는 것을 목표로 합니다.

- GitHub (코드 배포용): [https://github.com/roycekim84/worklog](https://github.com/roycekim84/worklog)
- 성격: 개인/사내 PC에서 쓰는 로컬 설치형 도구
- 저장 방식: `logs/YYYY/MM/YYYY-MM-DD.md`
- 중요 정책: 업무 로그 데이터는 회사 외부로 공유하지 않음

## 권장 실행 방식

- 현재 권장 방식은 **로컬 웹앱 실행**입니다.
- 설치/언인스톨 문제를 줄이기 위해 브라우저에서 `http://127.0.0.1:3210`으로 사용하는 경로를 우선합니다.
- Electron 설치형은 유지되지만, 회사 환경에서는 웹앱 경로가 더 안정적입니다.

## 목표 기능 (MVP)

- 월간 캘린더 메인 화면
- 날짜별 로그 존재 여부 표시
- 날짜 클릭 시 우측 에디터에서 읽기/수정
- Markdown 파일 생성/갱신
- 저장 후 Git `add` -> `commit` -> (옵션) `push`
- Generated Markdown + Rendered Preview 동시 미리보기
- 로그 검색 (날짜/본문)
- 선택 날짜 로그 PDF 내보내기
- 월간 요약 카드 (기록일수/작업항목/키워드)
- 다중 프로필 (추가/전환/삭제)

## 설치/운영 원칙 (회사 환경)

- 회사 PC에서는 `npm` 사용이 가능합니다.
- 회사 PC에서는 두 경로 중 하나를 사용합니다.
- `GitHub 코드 다운로드 -> npm install -> npm run ...`
- `빌드된 Windows 설치본(.exe/.zip) 실행`
- 실제 로그 저장소 remote는 사내 Git Enterprise만 사용합니다.
- 업무 로그 내용이 GitHub(공개/외부 remote)로 푸시되지 않도록 반드시 분리합니다.

## 개발 환경 (개인 개발용)

기본 스택:
- Electron
- React
- TypeScript
- Node.js

권장 버전:
- Node.js 20 LTS 이상
- Git 최신 안정 버전

## 빠른 시작 (웹앱)

### 1) 저장소 클론

```bash
git clone https://github.com/roycekim84/worklog.git
cd worklog
```

### 2) 의존성 설치

```bash
npm install
```

### 3) 웹앱 실행

```bash
npm run web
```

실행 후 브라우저에서 아래 주소를 엽니다.

```text
http://127.0.0.1:3210
```

검증된 동작:
- `npm run web` 실행 성공
- `GET /api/bootstrap` 정상 응답 확인

## 회사 PC 실행 방법

### 방법 A: 웹앱으로 실행 (권장)

```bash
git clone https://github.com/roycekim84/worklog.git
cd worklog
npm install
npm run web
```

브라우저 접속:

```text
http://127.0.0.1:3210
```

### 방법 B: Windows 설치본 실행

권장 방식:
1. 최신 설치본 위치를 확인합니다: [latest-installer/LATEST.md](/Users/roycekim/royce_lab/worklog/latest-installer/LATEST.md)
2. GitHub Releases 또는 사내 파일 공유에서 설치 파일(또는 압축 실행본)을 받습니다.
3. 회사 PC에 설치(또는 압축 해제) 후 앱을 실행합니다.
4. 첫 실행에서 "기존 로컬 저장소 사용"으로 사내 Git Enterprise 저장소를 연결합니다.

주의:
- 회사에 Mac은 없으므로 Windows 설치본 기준으로 운영합니다.
- 현재 확인된 Windows 설치본:
- `release/Worklog Setup 0.1.0.exe`
- `release/Worklog-0.1.0-arm64-win.zip`

## 설치본 생성

```bash
npm run package:win
```

생성 위치:
- `release/` 디렉터리
- Windows installer: `release/Worklog Setup 0.1.0.exe`
- Windows portable zip: `release/Worklog-0.1.0-arm64-win.zip`

참고:
- 설치본 바이너리는 Git 히스토리에 직접 커밋하지 않고 Releases 자산으로 배포합니다.

## 웹앱 실행 메모

- 로컬 설정 파일은 Electron 없이도 동작하도록 별도 경로에 저장됩니다.
- 브라우저에서는 폴더 선택 다이얼로그 대신 경로 입력 프롬프트를 사용합니다.
- 실제 Git 작업과 파일 저장은 로컬 Node 서버가 처리합니다.

## 앱 첫 실행 설정

앱 첫 실행 시 저장소 설정을 진행합니다.

설정 모드 A: 기존 로컬 저장소 사용
- 로컬 폴더 경로 선택
- 브랜치 입력
- 유효성 검사 후 저장

설정 모드 B: 원격 저장소 클론 (사내 Git Enterprise URL만 사용)
- 원격 Git URL 입력
- 로컬 대상 폴더 선택
- 브랜치 입력
- 클론/체크아웃 후 저장

저장되는 최소 설정:
- repo local path
- remote URL (회사 환경에서는 사내 Git Enterprise URL)
- branch
- logs root (기본 `logs/`)
- auto-push on/off
- allowed remote hosts (예: `git.company.local`)
  - 초기값은 `git.company.local`이며, 클론 URL 입력 시 host를 자동 제안합니다.

실행 중 재설정:
- 상단의 `저장소 재설정` 버튼으로 언제든 저장소/브랜치를 다시 설정할 수 있습니다.
- 상단의 `Preflight 검사` 버튼으로 현재 저장소/브랜치/origin 상태를 즉시 점검할 수 있습니다.
  - 최근 Preflight 결과 5건이 헤더에 표시됩니다.

## 일일 사용 흐름

1. 앱을 열면 현재 월 캘린더가 보입니다.
2. 로그가 있는 날짜는 마킹됩니다.
3. 날짜를 클릭하면 우측 에디터가 열립니다.
4. 기존 파일이 있으면 로드, 없으면 템플릿이 로드됩니다.
5. 에디터 하단에서 Generated Markdown과 Rendered Preview를 동시에 확인할 수 있습니다.
6. 저장하면 Markdown 파일이 생성/수정되고 Git 동기화가 실행됩니다.
7. 필요하면 `PDF 내보내기`로 `exports/YYYY/MM/YYYY-MM-DD.pdf`를 생성합니다.

## 검색 기능

- 상단 검색창에서 날짜/본문 키워드 검색 가능
- 검색 결과 클릭 시 해당 날짜 로그로 이동
- 결과는 최신 날짜 우선으로 표시

## 월간 요약

- 월별 기록일수, Work Log 항목 수, Next Action 항목 수를 집계
- 해당 월 로그에서 상위 키워드를 추출해 카드로 표시

## 다중 프로필

- 헤더에서 프로필 추가/전환/삭제 지원
- 프로필마다 저장소 설정(repo path, branch, 보안 옵션)을 분리 관리
- 프로필 전환 후 즉시 해당 저장소 기준으로 캘린더/로그 동작

## 로그 파일 규칙

- 경로 패턴: `logs/YYYY/MM/YYYY-MM-DD.md`
- 예시: `logs/2026/04/2026-04-22.md`
- 날짜당 파일은 정확히 1개만 유지

기본 템플릿:

```md
# 2026-04-22

## Project


## Work Log
- 

## Notes


## Next Action
- 
```

## Git 동작 규칙

저장 시 기본 순서:
1. 저장소 유효성 확인
2. (옵션) pull/fetch
3. 파일 저장
4. `git add`
5. `git commit`
6. auto-push가 켜져 있으면 `git push`

기본 커밋 메시지:

```text
worklog: update YYYY-MM-DD
```

회사 환경 권장:
- `origin`은 반드시 사내 Git Enterprise로 설정
- 외부 remote(GitHub 등)로 `push`되지 않도록 확인
- 저장소 상태 검증 시 `origin`이 GitHub면 경고 메시지가 표시됩니다.
- `origin`이 GitHub로 감지되면 auto-push는 자동 OFF 처리되며, push 시도도 차단됩니다.
- `allowed remote hosts`를 설정하면 해당 host 외 origin은 검증/푸시가 차단됩니다.
- 허용 host 입력값은 형식/중복 검증을 거치며 오류 시 저장할 수 없습니다.
- 헤더 보안 배지: `SAFE`, `WARNING`, `ERROR`로 현재 리포지토리 위험도를 표시합니다.

## 회사 PC 설치 체크리스트

회사에서 바로 세팅하려면:

1. Git 설치 및 사내 인증(SSH 키 또는 PAT) 준비
2. 아래 둘 중 하나 선택
3. 권장: GitHub 코드 다운로드 후 `npm install` 및 `npm run web`
4. 또는 설치본 실행: `.exe` 또는 `.zip`
5. 앱에서 사내 저장소/브랜치 설정 완료
6. `git remote -v`로 실제 로그 저장소 remote가 사내 주소인지 확인
7. 테스트 날짜 하나 저장 후 커밋/푸시 성공 확인

## 주의 사항 (보안/프라이버시)

- 로그 내용은 외부 서버로 전송하지 않습니다. (Git remote 동기화 제외)
- 회사 사용 시 Git remote는 사내 Git Enterprise만 사용하세요.
- GitHub 저장소는 앱 코드 배포/다운로드 용도로만 사용하세요.
- 비밀번호, 토큰, 사내 기밀 URL, 민감한 소스코드를 기록하지 마세요.
- 목적은 "짧고 안전한 업무 요약"입니다.

## 문제 해결

- 개발 PC에서 `npm install` 실패:
  - Node.js 버전 확인 (`node -v`, Node 20+ 필요)
  - 사내망/프록시 환경이면 npm registry 접근 정책 확인
  - `preinstall` 단계의 환경 체크 메시지 확인
- 회사 PC에서 `npm install` 실패:
  - Node.js 버전 확인 (`node -v`, Node 20+ 필요)
  - 사내망/프록시 환경이면 npm registry 접근 정책 확인
  - 웹앱 기동이 안 되면 `http://127.0.0.1:3210` 포트 사용 가능 여부 확인
  - 직접 실행이 막히면 [latest-installer/LATEST.md](/Users/roycekim/royce_lab/worklog/latest-installer/LATEST.md)의 Windows 설치본 경로를 사용
- `git push` 실패:
  - 인증 상태 확인 (`git remote -v`, `git config`, SSH 키/PAT)
  - 브랜치 권한/보호 규칙 확인
- 외부 remote로 잘못 푸시될 우려:
  - `git remote -v`로 remote 주소 즉시 점검
  - 사내 Git Enterprise URL이 아니면 remote 재설정 후 사용
- 브랜치 오류:
  - 설정 브랜치가 실제로 존재하는지 확인
- 저장소 인식 실패:
  - `.git` 폴더 존재 여부 확인
  - 권한 문제(회사 보안 정책) 확인
- 앱 상태바에는 실패 원인에 맞는 `조치` 가이드가 함께 표시됩니다.

## 회사 수동 테스트

- 회사 배포 전 점검: [docs/company-qa-checklist.md](/Users/roycekim/royce_lab/worklog/docs/company-qa-checklist.md)

## 로드맵 (MVP 이후)

- 월간 요약 고도화 (주간/프로젝트별 breakdown)
- 다중 프로필 고도화 (이름 변경/정렬)
