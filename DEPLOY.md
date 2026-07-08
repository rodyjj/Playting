# 배포 가이드 — GitHub → Supabase → Vercel

이 문서는 지금 로컬에만 있는 Playting 프로젝트를 GitHub에 올리고, Supabase(DB)와 Vercel(호스팅)을 연결해서 실제로 접속 가능한 웹 링크로 배포하는 전체 과정을 순서대로 안내합니다. 박람회 시연처럼 "배포된 링크 하나로 방문객이 체험"하는 방식을 기준으로 작성했습니다.

체크리스트만 빠르게 보고 싶다면 각 단계 제목만 훑어도 됩니다.

## 사전 준비물

- [ ] GitHub 계정
- [ ] Supabase 계정
- [ ] Vercel 계정 (GitHub 계정으로 가입하면 다음 단계 연동이 더 쉽습니다)
- 로컬에는 이미 Git, Node.js가 설치되어 있는 상태입니다.

---

## 1단계. 로컬 Git 저장소 준비

이미 다음까지는 처리해뒀습니다:
- `.gitignore`에 `.env.local`(진짜 API 키가 든 파일)과 사용하지 않는 원본 디자인 파일들(`table/`, `Logo.png` 등)이 제외되도록 설정 완료.
- 로컬 `git init` 완료 (아직 커밋은 없는 상태).

이제 아래 명령어를 **본인 터미널에서 직접** 실행해주세요 (Git 커밋에 이름/이메일이 필요한데, 이건 사용자 계정 정보라 제가 대신 설정하지 않습니다):

```bash
cd "C:\Users\wjdwl\Desktop\기획\Playting"
git config user.name "본인 이름 또는 GitHub 아이디"
git config user.email "본인 GitHub 가입 이메일"
```

실행하셨다면 저에게 "git config 설정했어" 라고 알려주세요. 그러면 제가 이어서:

```bash
git add -A
git commit -m "Initial commit"
```

을 실행해서 첫 커밋을 만들어드릴게요.

---

## 2단계. GitHub에 저장소 만들고 올리기

1. [github.com/new](https://github.com/new) 접속
2. Repository name: `playting` (원하는 이름으로 변경 가능)
3. **Public/Private 중 선택** — 박람회 시연용이라면 Private을 추천합니다 (코드 자체는 비밀이 없지만, 굳이 공개할 필요는 없음).
4. "Add a README file", "Add .gitignore", "Choose a license" 는 **전부 체크 해제** — 이미 로컬에 다 있는 상태라 체크하면 충돌이 납니다.
5. **Create repository** 클릭
6. 생성된 저장소 페이지에 보이는 주소 복사 (예: `https://github.com/내아이디/playting.git`)

주소를 저에게 알려주시면 제가 이어서 실행합니다:

```bash
git remote add origin <복사한 주소>
git branch -M main
git push -u origin main
```

push 도중 GitHub 로그인 창(브라우저 인증 또는 아이디/토큰 입력)이 뜰 수 있습니다 — 이건 본인 GitHub 계정으로 직접 인증해주셔야 합니다.

---

## 3단계. Supabase 프로젝트 만들기

1. [supabase.com](https://supabase.com) 가입/로그인
2. **New Project** 클릭
   - Organization: 개인 계정 그대로 사용
   - Name: `playting` 등 원하는 이름
   - Database Password: 자동 생성 또는 직접 입력 (어딘가에 저장해두기 — 나중에 API 키와는 별개로 필요할 수 있음)
   - Region: `Northeast Asia (Seoul)` 선택 권장 (한국에서 접속 시 속도 유리)
3. 프로젝트 생성이 끝날 때까지 1~2분 대기
4. 왼쪽 메뉴 **SQL Editor** 클릭 → **New query**
5. 이 저장소의 [supabase/schema.sql](supabase/schema.sql) 파일 내용을 전부 복사해서 붙여넣고 **Run** 클릭
   - 성공하면 `onboarding_profiles` 테이블이 생성됩니다.
6. 왼쪽 메뉴 **Project Settings → API** 이동
7. 다음 두 값을 복사해서 메모장 등에 임시로 적어두기:
   - **Project URL** (`https://xxxxx.supabase.co` 형태)
   - **anon public** 키 (긴 문자열)

이 두 값은 4단계에서 Vercel에 그대로 입력합니다.

---

## 4단계. Vercel에 배포하기

1. [vercel.com/new](https://vercel.com/new) 접속 (GitHub 계정으로 로그인)
2. **Import Git Repository** 목록에서 방금 만든 `playting` 저장소 선택
   - 목록에 안 보이면 "Adjust GitHub App Permissions"를 눌러 해당 저장소 접근 권한을 허용
3. Framework Preset은 Next.js로 자동 인식됨 — 그대로 두기
4. **Environment Variables** 섹션 펼치고 아래 5개를 하나씩 추가 (Name / Value 순서로 입력 후 Add):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | 3단계에서 복사한 Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 3단계에서 복사한 anon public 키 |
   | `TMDB_API_KEY` | 로컬 `.env.local`에 있는 값 |
   | `GEMINI_API_KEY` | 로컬 `.env.local`에 있는 값 |
   | `YOUTUBE_API_KEY` | 로컬 `.env.local`에 있는 값 |

5. **Deploy** 클릭
6. 1~2분 정도 빌드가 진행되고, 끝나면 `https://playting-xxxx.vercel.app` 같은 배포 URL이 발급됩니다.

---

## 5단계. 배포 확인

배포된 URL에 접속해서 다음을 실제로 눌러보며 확인합니다:

- [ ] 온보딩(연령/OTT/장르/선호 배우·감독 선택)이 끝까지 진행되는지
- [ ] 온보딩 완료 후 홈 화면에 AI 추천 코스가 뜨는지 (Gemini 키 확인)
- [ ] 검색창에서 작품 검색 시 포스터/정보가 뜨는지 (TMDB 키 확인)
- [ ] "맞춤 코스"에서 메인디쉬 선택 후 "주문하기" → 팝업이 자동으로 뜨고 예고편/보조 영상이 재생되는지 (YouTube 키 확인)
- [ ] Supabase 대시보드의 **Table Editor → onboarding_profiles**에 방금 온보딩한 행이 실제로 쌓이는지 (DB 연결 확인)

전부 정상이면 배포가 끝난 것이고, 이 URL을 박람회 부스에서 그대로 사용하시면 됩니다.

---

## 6단계. 이후 수정사항 반영하는 방법

배포 이후에 기능을 추가/수정하고 싶을 때는:

1. 클로드에게 평소처럼 수정 요청 → 로컬에서 수정 및 브라우저 검증
2. 확인 후 "커밋하고 푸시해줘"라고 요청
3. 클로드가 `git add` → `git commit` → `git push` 실행 → GitHub의 `main` 브랜치가 업데이트됨
4. Vercel이 GitHub push를 자동 감지해서 새로 빌드 시작 → 1~2분 뒤 배포 URL이 자동으로 최신 상태로 교체됨 (별도 클릭 불필요)

즉 2단계("커밋하고 푸시해줘")만 매번 요청하면, 이후 배포/반영은 전부 자동입니다.
