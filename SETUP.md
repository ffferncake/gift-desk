# 축의대 접수 관리 설정

## 실행

```bash
npm run dev
```

## Google Apps Script 연결

1. Google Sheets에서 사용할 스프레드시트를 준비합니다.
2. `확장 프로그램 > Apps Script`를 엽니다.
3. `app-script/Code.gs` 내용을 붙여 넣습니다.
4. 다른 스프레드시트를 쓰려면 `Code.gs`의 `SPREADSHEET_ID`를 바꿉니다.
5. `배포 > 새 배포 > 웹 앱`을 선택합니다.
6. 실행 권한은 본인, 액세스 권한은 `모든 사용자` 또는 현장 사용자가 접근 가능한 범위로 설정합니다.
7. 발급된 웹앱 URL을 `.env.local`에 넣습니다.

```bash
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

`.env.local`을 만든 뒤에는 Next.js 개발 서버를 다시 시작해야 합니다.

웹앱 URL이 없어도 화면 입력과 CSV 저장은 동작합니다.
