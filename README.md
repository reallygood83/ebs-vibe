# 모아클래스 · EBS Vibe

학교·학급·수행평가 공지를 기록하고 검색하며, YouTube 영상 수업과 댓글을 함께 사용하는 교사용 웹 앱입니다.

## 로컬 실행

Node.js 24.12 이상이 필요합니다.

```sh
npm ci
cp .env.example .env.local
# .env.local에 Firebase 웹 앱 SDK 값 입력
npm run dev
```

개발 주소: http://localhost:5173

Firebase 프로젝트: `ebs-vibe`, Firestore `(default)` Standard, 서울 리전. `.env.local`은 Git에서 제외합니다. Firebase 웹 SDK 설정은 클라이언트용 설정이며 실제 접근 권한은 `firestore.rules`로 제어합니다. Admin SDK 키나 CLI 인증 정보는 앱에 포함하지 않습니다.

## 사용

- 첫 화면의 예시 자료는 샘플입니다. **체험 모드**에서만 브라우저에 저장하며 Firebase에는 쓰지 않습니다.
- **Google 로그인** 후 실제 개인 공지함을 사용합니다. 기존 체험 자료는 자동 업로드하지 않습니다.
- 공지는 학교·학급·수행평가별로 검색하고, 마감일·중요 표시·완료 상태·북마크를 관리할 수 있습니다.
- 수업에는 YouTube 주소와 수업 설명을 등록합니다. 영상 제공자가 외부 재생을 제한하면 YouTube에서 직접 확인합니다.
- 수업의 공유를 켜고 링크를 전달하면 해당 수업과 댓글만 볼 수 있습니다. 학생은 Google 로그인 후 별명으로 댓글을 답니다. 실제 이름이나 학번 입력은 요구하지 않습니다.
- 공유 링크를 아는 사람은 해당 수업과 댓글을 열람할 수 있습니다. 비공개로 바꾸면 링크 접근도 차단됩니다. 공지함은 본인만 볼 수 있습니다.
- 공지는 직접 등록하거나 붙여넣어 기록하는 방식입니다. 학교 시스템의 알림을 자동 수집하는 기능은 포함하지 않습니다.

## 검증

```sh
npm run lint
npm run typecheck
npm test
npm run build
# Java 21+ 및 Firebase CLI 필요
npx firebase-tools@latest emulators:exec --only firestore --project demo-ebs-vibe 'npm run test:rules'
```

규칙 테스트는 소유자 CRUD, 타인 접근 거부, 공유 수업 열람, 로그인 댓글, 위조 작성자 거부, 북마크 격리를 검사합니다.

## Firebase 규칙 배포

```sh
npx firebase-tools@latest deploy --only firestore:rules --project ebs-vibe
```

로그인: Firebase Authentication의 Google 공급자를 활성화하고 `localhost` 및 실제 Vercel 배포 도메인을 승인 도메인에 등록합니다.

## Vercel

GitHub `reallygood83/ebs-vibe`를 Import하고 Framework를 Vite로 선택합니다. `.env.example`의 네 환경변수를 Vercel 프로젝트의 Production/Preview에 입력합니다. Build: `npm run build`, Output: `dist`. Node.js: 24.x.

배포 후 Firebase Auth 승인 도메인에 배포 도메인을 추가하고 실제 Google 로그인 → 공지 저장 → 새로고침 → 공유 링크 → 학생 댓글 흐름을 확인합니다. Google 계정의 비밀번호나 인증 코드는 개발자에게 전달하지 않습니다.
