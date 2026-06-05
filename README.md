# Reaction Rank

반응속도를 측정하고 랭킹에 저장하는 수업용 웹 게임입니다. React + Vite로 게임을 만들고, Firebase Realtime Database에 점수를 저장한 뒤, GitHub 저장소를 Vercel에 연결해서 배포하는 흐름을 연습할 수 있습니다.

## 기능

- 무작위 대기 시간 뒤 초록색 신호가 뜨면 클릭
- 반응속도(ms), 개인 최고 기록, 예상 랭킹 표시
- Firebase 설정 전에는 로컬 데모 랭킹으로 동작
- Firebase 설정 후에는 Realtime Database `scores` 경로에 점수 저장
- Vercel 배포용 `vercel.json` 포함

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:5173`으로 접속합니다.

## Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트를 만듭니다.
2. Authentication에서 `Anonymous` 로그인을 켭니다.
3. Realtime Database를 만들고 데이터베이스 URL을 확인합니다.
4. 프로젝트 설정에서 웹 앱을 추가하고 Firebase config 값을 복사합니다.
5. `.env.example`을 참고해서 `.env` 파일을 만듭니다.

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Realtime Database 규칙 예시:

```json
{
  "rules": {
    "scores": {
      ".read": true,
      ".indexOn": ["score"],
      "$scoreId": {
        ".write": "auth != null && !data.exists() && newData.hasChildren(['name', 'score', 'createdAt'])",
        ".validate": "newData.child('name').isString() && newData.child('name').val().length > 0 && newData.child('name').val().length <= 16 && newData.child('score').isNumber() && newData.child('score').val() >= 80 && newData.child('score').val() <= 5000"
      }
    }
  }
}
```

## GitHub에 올리기

```bash
git init
git add .
git commit -m "Create reaction ranking game"
git branch -M main
git remote add origin https://github.com/USER/REPOSITORY.git
git push -u origin main
```

## Vercel 배포

1. [Vercel](https://vercel.com/)에서 GitHub 저장소를 Import합니다.
2. Framework Preset은 `Vite`로 둡니다.
3. Firebase를 연결했다면 Vercel Project Settings의 Environment Variables에 `.env` 값을 그대로 추가합니다.
4. Deploy를 누릅니다.

## 발표 포인트

- 랜덤 대기 시간과 `performance.now()`로 반응속도를 계산합니다.
- Realtime Database는 점수 저장과 랭킹 조회에 사용됩니다.
- Anonymous Auth를 사용해서 로그인 화면 없이도 안전 규칙을 적용할 수 있습니다.
- GitHub에 코드를 올리고 Vercel이 자동으로 빌드해서 웹에 공개합니다.
