# Playting

플랫폼에 상관없이 취향에 맞는 영화·드라마·애니메이션·예능을 AI가 "감상 코스"로 묶어 추천하는 서비스.

## 시작하기 전에 — 이 프로젝트가 필요로 하는 것들

이 저장소를 새로 clone 했다면(다른 컴퓨터, 다른 계정 포함) 코드만으로는 아무 기능도 켜지지 않습니다. `.env.local`은 의도적으로 git에 커밋되지 않으므로, **각자 자신의 계정으로 아래 4가지를 직접 발급/설정**해야 합니다.

| 키 | 용도 | 발급처 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 온보딩 데이터 저장/조회 | [supabase.com](https://supabase.com) → 새 프로젝트 생성 |
| `TMDB_API_KEY` | 작품 포스터·감독/출연진·OTT 시청 링크 자동 조회 | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) (무료) |
| `GEMINI_API_KEY` | AI 감상 코스 생성 · 맞춤 코스의 "디저트" 영상 성향 분석 | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (무료) |
| `YOUTUBE_API_KEY` | 맞춤 코스 팝업의 예고편(에피타이저)·보조 영상(디저트) 검색 | [console.cloud.google.com](https://console.cloud.google.com) → "YouTube Data API v3" 활성화 후 API 키 발급 (무료, 일일 쿼터 내) |

키가 없어도 앱 자체는 실행되고 온보딩도 가능하지만, 해당 기능 자리에 "키가 필요해요" 안내만 표시됩니다.

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 준비 (필수 — 아래 "DB 없이도 동작하나요?" 참고)

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. 프로젝트의 SQL Editor에서 [`supabase/schema.sql`](./supabase/schema.sql) 내용을 그대로 실행해 `onboarding_profiles` 테이블을 만듭니다.
3. 프로젝트 설정의 API 메뉴에서 `Project URL`과 `anon public` 키를 복사합니다.

### 3. 환경 변수 설정

`.env.local.example`을 복사해 `.env.local`을 만들고 위에서 발급받은 값을 채웁니다.

```bash
cp .env.local.example .env.local
```

### 4. 로컬 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

## DB 없이도 동작하나요? (온보딩 데이터가 저장되는 방식)

- 온보딩 결과(선호 장르, 감독/배우 등)는 브라우저의 `localStorage`에도 항상 저장되어, Supabase를 설정하지 않은 상태에서도 온보딩 → 홈 화면 흐름 자체는 끊기지 않습니다.
- **Supabase가 설정되어 있으면 그쪽이 진짜 소스입니다.** 홈 화면은 매번 Supabase에서 해당 브라우저의 `client_id`로 프로필을 먼저 조회하고, 있으면 그 값으로 AI 코스를 생성합니다 (localStorage는 조회 실패 시의 캐시/폴백일 뿐입니다).
- 단, 사용자 식별은 로그인 없이 브라우저에 저장된 익명 `client_id`(uuid) 기준입니다. 즉 **같은 브라우저**에서는 캐시가 지워져도 DB에서 복구되지만, 완전히 다른 기기/브라우저로 접속하면 새 `client_id`가 발급되어 처음부터 다시 온보딩하게 됩니다 (실제 로그인 기능이 없기 때문에 발생하는 자연스러운 한계입니다).

## 배포 (Vercel)

1. GitHub에 push한 저장소를 [Vercel](https://vercel.com/new)에 연결합니다.
2. Vercel 프로젝트의 **Settings → Environment Variables**에 위 4종 키를 동일하게 등록합니다 (`.env.local`은 배포에 자동으로 반영되지 않습니다).
3. 재배포하면 모든 방문자가 같은 키를 공유해서 사용합니다 (TMDB/Gemini/YouTube 사용량은 이 계정 기준으로 집계됩니다 — 모두 무료 티어 한도 내에서는 과금되지 않습니다).

## 기술 스택

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase · TMDB API · Gemini API (`@google/genai`) · YouTube Data API v3
