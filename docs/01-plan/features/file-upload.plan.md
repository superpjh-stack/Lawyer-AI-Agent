# Plan: file-upload (Supabase Storage 파일 업로드)

## 개요
현재 Document 모델은 `fileUrl`만 저장하고 실제 파일 업로드 기능이 없음.
Supabase Storage를 연동하여 PDF/DOCX 파일을 실제로 업로드·저장하고,
RAG 인제스트(임베딩 생성)까지 자동 연결하는 완성형 파이프라인을 구현한다.

## 목표 (Why)
- 사용자가 계약서·판결문 등을 앱에서 직접 업로드하고 AI가 분석할 수 있도록
- 업로드된 파일이 RAG 지식베이스에 자동 인제스트되어 채팅 검색에 활용
- 현재 하드코딩된 mock fileUrl을 실제 Storage URL로 대체

## 범위 (Scope)

### In-Scope
- Supabase Storage 버킷 설정 (`documents` 버킷)
- `/api/documents/upload` 엔드포인트 — multipart/form-data 수신 → Storage 업로드 → DB 저장
- `/api/knowledge/upload` 엔드포인트 — 지식베이스 직접 업로드
- 프론트엔드 파일 드래그앤드롭 UI (DocumentUpload 컴포넌트)
- 업로드 완료 후 자동 RAG 인제스트 트리거 (백그라운드)
- 파일 타입 검증: PDF, DOCX, TXT (최대 20MB)

### Out-of-Scope
- 파일 미리보기 (PDF viewer)
- 버전 관리 (파일 덮어쓰기 방식)
- 멀티파트 대용량 업로드 (20MB 이하로 제한)

## 사용자 스토리
1. 변호사가 문서 페이지에서 계약서 PDF를 업로드한다
2. 업로드 완료 즉시 문서 목록에 표시되고 임베딩 처리 상태(processing)가 보인다
3. 임베딩 완료 후 채팅창에서 "이 계약서에서 손해배상 조항을 찾아줘" 검색이 된다

## 기술 스택
- **Storage**: Supabase Storage (이미 `.env.local`에 설정값 있음, key 입력 필요)
- **Upload**: `@supabase/supabase-js` 클라이언트
- **파일 수신**: Next.js Route Handler + `formidable` 또는 Web API `FormData`
- **RAG 연동**: 업로드 후 `/api/knowledge/ingest` 비동기 호출

## 성공 기준
- [ ] PDF 20MB 파일 업로드 → Supabase Storage URL 저장 완료
- [ ] 업로드 후 `embeddingStatus: processing` → `completed` 전환
- [ ] 채팅에서 업로드 파일 내용 기반 답변 가능
- [ ] 실패 시 에러 메시지 표시 및 `embeddingStatus: failed` 처리

## 우선순위
**P0 (필수)**: Storage 업로드 + DB 저장 + 프론트엔드 UI
**P1 (중요)**: 자동 RAG 인제스트 연결
**P2 (선택)**: 업로드 진행률 표시

## 예상 작업량
- API: 2개 엔드포인트 수정/신규
- Frontend: 1개 신규 컴포넌트 + 기존 페이지 연동
- Config: Supabase Storage 버킷 설정
- 총 예상: 반나절
