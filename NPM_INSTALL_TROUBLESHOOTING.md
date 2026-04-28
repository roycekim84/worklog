# npm install Troubleshooting

회사 PC 또는 개발 PC에서 아래와 같은 에러가 나오면, 이 프로젝트 문제가 아니라 **Node/npm 설치 자체가 깨진 상태**일 가능성이 큽니다.

예시:

```text
cannot find module npm-prefix.js
cannot find module npm-cli.js
code: MODULE_NOT_FOUND
```

## 핵심 원인

- `npm` 실행 파일이 실제 npm 설치 위치를 못 찾고 있음
- `node.exe`와 `npm.cmd`가 서로 다른 설치본을 가리키고 있음
- 예전 Node 제거 후 PATH가 꼬였음
- 지원하지 않는 Node 버전을 사용 중임

이 프로젝트 권장 버전:

```text
Node.js 20.x 또는 22.x LTS
```

현재 프로젝트는 `node >=20 <23` 기준입니다.

## 1. 먼저 확인할 것

Windows `cmd` 또는 PowerShell에서:

```powershell
node -v
npm -v
where node
where npm
```

정상 기대:
- `node`와 `npm` 경로가 같은 Node 설치 폴더를 가리킴
- 예: 둘 다 `C:\Program Files\nodejs\...`

비정상 예:
- `node`는 새 버전 경로
- `npm`은 예전 경로 또는 없는 경로

이 경우 npm 설치가 깨진 상태입니다.

## 2. 가장 현실적인 해결 방법

1. 기존 Node.js 제거
2. 회사 PC 재부팅
3. **Node.js 22 LTS** 또는 **Node.js 20 LTS** 재설치
4. 새 터미널 열기
5. 다시 아래 확인

```powershell
node -v
npm -v
where node
where npm
```

6. 그 다음 프로젝트 폴더에서 실행

```powershell
npm install
npm run web
```

## 3. Node 24/25는 피하는 것이 좋음

현재 프로젝트는 다음 범위를 기준으로 테스트했습니다.

```text
>=20 <23
```

따라서:
- `Node 24.x`
- `Node 25.x`

같은 버전에서는 예상치 못한 문제를 피하기 위해 사용하지 않는 편이 좋습니다.

## 4. 회사 PC에서 직접 빌드가 계속 막히면

빌드 대신 아래 경로를 사용합니다.

1. [latest-installer/LATEST.md](/Users/roycekim/royce_lab/worklog/latest-installer/LATEST.md) 확인
2. Windows 설치본 또는 zip 실행

## 5. 웹앱 실행 시 확인할 것

`npm install`이 끝난 뒤:

```powershell
npm run web
```

브라우저 접속:

```text
http://127.0.0.1:3210
```

웹앱이 안 뜨면 확인:
- 회사 보안 정책이 `127.0.0.1:3210` 로컬 포트를 막는지
- 백신/보안 솔루션이 Node 프로세스를 차단하는지

## 6. 결론

이 에러는 보통 `worklog` 코드 문제가 아니라, **회사 PC의 Node/npm 설치 문제**입니다.

가장 빠른 해결 순서:
1. Node 20/22 LTS 재설치
2. `npm install`
3. `npm run web`
4. 안 되면 설치본 실행 경로 사용
