# 부품 견적 요청 웹앱

Excel 부품 리스트를 업로드하면 업체별 견적 입력 링크를 만들고, 업체는 링크에서 단가만 입력합니다. 가격이 입력되면 자동 제출되고 관리자 화면에서 업체별 단가와 총액을 비교할 수 있습니다.

## 로컬 실행

Windows에서는 `start_portal.cmd`를 더블클릭하거나 아래 명령을 실행합니다.

```powershell
& "C:\Users\user\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" server.py
```

브라우저에서 `http://127.0.0.1:8000`을 엽니다.

## Excel 형식

첫 번째 시트에 아래 헤더를 넣으면 됩니다.

| 구분 | 품목 | 사양 | 수량 | 단위 | 비고 |
| --- | --- | --- | --- | --- | --- |
| CPU | Intel Xeon | Gold 6430 또는 동급 | 2 | EA | 정품 |
| RAM | DDR5 ECC RDIMM | 64GB | 16 | EA | |
| SSD | NVMe SSD | 3.84TB Enterprise | 4 | EA | |
| GPU | NVIDIA GPU | L40S 또는 동급 | 2 | EA | |

## 업체 목록 입력

요청 생성 화면의 업체 목록에는 한 줄에 하나씩 입력합니다.

```text
업체명, 담당자, 이메일
ABC컴퓨터, 홍길동, hong@example.com
테크유통, 김영희, kim@example.com
```

## Render 배포

이 저장소에는 Render 배포용 `render.yaml`, `requirements.txt`, `runtime.txt`가 포함되어 있습니다.

1. GitHub에 이 프로젝트를 올립니다.
2. Render Dashboard에서 `New` > `Blueprint`를 선택합니다.
3. GitHub 저장소를 연결합니다.
4. `render.yaml`을 감지하면 `quote-portal` 서비스를 생성합니다.
5. 배포가 끝나면 Render가 제공하는 `onrender.com` 주소로 접속합니다.

Render 설정 요약:

- 서비스 타입: Web Service
- 런타임: Python
- 빌드 명령: `pip install -r requirements.txt`
- 시작 명령: `python server.py`
- 데이터 저장 경로: `/var/data`
- Persistent Disk: 1GB

## 이메일 알림 설정

Render 서비스의 Environment 탭에서 아래 환경변수를 추가하면 업체가 처음 가격을 입력하는 즉시 회사 이메일로 알림을 보낼 수 있습니다. 설정하지 않으면 관리자 화면의 알림 기록만 남습니다.

```text
QUOTE_NOTIFY_EMAIL=company@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=smtp-user
SMTP_PASSWORD=smtp-password
SMTP_FROM=quote@example.com
```

## 다음 단계 후보

- 업체 링크 자동 이메일 발송
- 관리자 화면에서 Excel 비교표 다운로드
- 사양서 PDF/Word/HWP 업로드 후 부품 Excel 자동 추출
- 업체별 제출 마감 리마인드
