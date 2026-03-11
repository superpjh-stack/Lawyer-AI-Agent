import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // ── Firm ──────────────────────────────────────────────
  let firm = await prisma.firm.findFirst({ where: { name: "LexAgent 법률사무소" } })
  if (!firm) {
    firm = await prisma.firm.create({
      data: { name: "LexAgent 법률사무소", plan: "professional", maxUsers: 10 },
    })
    console.log("✅ Firm 생성:", firm.name)
  } else {
    console.log("⏭️  Firm 이미 존재:", firm.name)
  }

  // ── Users ─────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin1234", 12)

  const lawyerHash = await bcrypt.hash("lawyer1234", 12)

  const usersData = [
    { name: "관리자", email: "admin@lexagent.kr", role: "admin", hash: adminHash },
    { name: "김민준 변호사", email: "minjun@lexagent.kr", role: "lawyer", hash: adminHash },
    { name: "이서연 변호사", email: "seoyeon@lexagent.kr", role: "lawyer", hash: adminHash },
    { name: "Jay Park", email: "hyunsoo@lexagent.kr", role: "lawyer", hash: lawyerHash },
    { name: "Mina Jung", email: "mina@lexagent.kr", role: "lawyer", hash: lawyerHash },
  ]

  const users: Record<string, string> = {} // email → id
  for (const u of usersData) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (!existing) {
      const created = await prisma.user.create({
        data: { firmId: firm.id, name: u.name, email: u.email, passwordHash: u.hash, role: u.role },
      })
      users[u.email] = created.id
      console.log("✅ User 생성:", u.email)
    } else {
      users[u.email] = existing.id
      console.log("⏭️  User 이미 존재:", u.email)
    }
  }

  const adminId = users["admin@lexagent.kr"]
  const lawyer1Id = users["minjun@lexagent.kr"]
  const lawyer2Id = users["seoyeon@lexagent.kr"]
  const minaId = users["mina@lexagent.kr"]
  const jayParkId = users["hyunsoo@lexagent.kr"]

  // ── Clients (10명) ────────────────────────────────────
  const clientsData = [
    { name: "홍길동", email: "hong@example.com", phone: "010-1234-5678", type: "individual" },
    { name: "이영희", email: "lee@example.com", phone: "010-2345-6789", type: "individual" },
    { name: "박철수", email: "park@example.com", phone: "010-3456-7890", type: "individual" },
    { name: "주식회사 테크원", email: "ceo@techone.kr", phone: "02-1234-5678", type: "corporate" },
    { name: "한국무역 주식회사", email: "legal@ktrade.co.kr", phone: "02-2345-6789", type: "corporate" },
    { name: "정수진", email: "jung@example.com", phone: "010-4567-8901", type: "individual" },
    { name: "최민호", email: "choi@example.com", phone: "010-5678-9012", type: "individual" },
    { name: "글로벌파트너스(주)", email: "info@globalpartners.kr", phone: "02-3456-7890", type: "corporate" },
    { name: "강지우", email: "kang@example.com", phone: "010-6789-0123", type: "individual" },
    { name: "신흥건설 주식회사", email: "legal@shbuilding.kr", phone: "031-234-5678", type: "corporate" },
    { name: "오세준", email: "oh@example.com", phone: "010-7890-1234", type: "individual" },
    { name: "스타트업코리아(주)", email: "ceo@startupkorea.kr", phone: "02-4567-8901", type: "corporate" },
    { name: "김다은", email: "kim.daeeun@example.com", phone: "010-8901-2345", type: "individual" },
  ]

  const clientIds: string[] = []
  for (const c of clientsData) {
    const existing = await prisma.client.findFirst({ where: { firmId: firm.id, name: c.name } })
    if (!existing) {
      const created = await prisma.client.create({
        data: { firmId: firm.id, ...c },
      })
      clientIds.push(created.id)
    } else {
      clientIds.push(existing.id)
    }
  }
  console.log(`✅ Clients: ${clientIds.length}명`)

  // ── Cases (10건) ──────────────────────────────────────
  const now = new Date()
  const casesData = [
    {
      caseNumber: "2025가합10001",
      title: "대여금 반환 청구",
      description: "피고 홍길동에 대한 5,000만원 대여금 반환 소송",
      clientId: clientIds[0],
      assignedUserId: lawyer1Id,
      status: "active",
      category: "민사",
      courtName: "서울중앙지방법원",
      caseYear: "2025",
    },
    {
      caseNumber: "2025형제20045",
      title: "업무상 횡령",
      description: "전 임원의 회사 자금 횡령 사건",
      clientId: clientIds[3],
      assignedUserId: lawyer1Id,
      status: "active",
      category: "형사",
      courtName: "서울중앙지방법원",
      caseYear: "2025",
    },
    {
      caseNumber: "2025가단30102",
      title: "부동산 명도 소송",
      description: "임대차 계약 종료 후 임차인 명도 청구",
      clientId: clientIds[1],
      assignedUserId: lawyer2Id,
      status: "active",
      category: "민사",
      courtName: "서울동부지방법원",
      caseYear: "2025",
    },
    {
      caseNumber: "2025나40088",
      title: "손해배상 청구 (교통사고)",
      description: "교통사고로 인한 손해배상 항소심",
      clientId: clientIds[2],
      assignedUserId: lawyer2Id,
      status: "active",
      category: "민사",
      courtName: "서울고등법원",
      caseYear: "2025",
    },
    {
      caseNumber: "2025가합50017",
      title: "계약 해제 및 위약금 청구",
      description: "공급계약 해제 및 위약금 5억원 청구 소송",
      clientId: clientIds[4],
      assignedUserId: lawyer1Id,
      status: "active",
      category: "상사",
      courtName: "서울중앙지방법원",
      caseYear: "2025",
    },
    {
      caseNumber: "2024가합60203",
      title: "상표권 침해 금지",
      description: "경쟁사의 유사 상표 사용 금지 및 손해배상",
      clientId: clientIds[7],
      assignedUserId: lawyer1Id,
      status: "active",
      category: "지식재산",
      courtName: "서울중앙지방법원",
      caseYear: "2024",
    },
    {
      caseNumber: "2025가단70041",
      title: "임금 체불 청구",
      description: "미지급 임금 및 퇴직금 3,200만원 청구",
      clientId: clientIds[5],
      assignedUserId: lawyer2Id,
      status: "active",
      category: "노동",
      courtName: "서울남부지방법원",
      caseYear: "2025",
    },
    {
      caseNumber: "2024나80156",
      title: "건설 도급계약 분쟁",
      description: "공사대금 미지급 및 하자보수 관련 분쟁",
      clientId: clientIds[9],
      assignedUserId: lawyer1Id,
      status: "pending",
      category: "건설",
      courtName: "수원고등법원",
      caseYear: "2024",
    },
    {
      caseNumber: "2025가합90022",
      title: "주주간 분쟁",
      description: "소수주주의 경영권 남용 금지 청구",
      clientId: clientIds[3],
      assignedUserId: lawyer2Id,
      status: "active",
      category: "상사",
      courtName: "서울중앙지방법원",
      caseYear: "2025",
    },
    {
      caseNumber: "2023가합10099",
      title: "이혼 및 재산분할",
      description: "이혼 소송 및 재산분할, 위자료 청구",
      clientId: clientIds[6],
      assignedUserId: lawyer2Id,
      status: "closed",
      category: "가사",
      courtName: "서울가정법원",
      caseYear: "2023",
    },
    // ── Mina Jung 사건 5건 ──
    {
      caseNumber: "2026가합11001",
      title: "저작권 침해 손해배상 청구",
      description: "온라인 플랫폼의 무단 콘텐츠 복제에 따른 저작권 침해 손해배상 소송",
      clientId: clientIds[10],
      assignedUserId: minaId,
      status: "active",
      category: "지식재산",
      courtName: "서울중앙지방법원",
      caseYear: "2026",
    },
    {
      caseNumber: "2026가단11002",
      title: "직장 내 성희롱 손해배상",
      description: "직장 내 성희롱으로 인한 정신적 손해배상 및 원직복직 청구",
      clientId: clientIds[12],
      assignedUserId: minaId,
      status: "active",
      category: "노동",
      courtName: "서울남부지방법원",
      caseYear: "2026",
    },
    {
      caseNumber: "2026가합11003",
      title: "개인정보 유출 손해배상",
      description: "기업의 개인정보 관리 소홀로 인한 정보 유출 피해 집단소송",
      clientId: clientIds[11],
      assignedUserId: minaId,
      status: "active",
      category: "민사",
      courtName: "서울중앙지방법원",
      caseYear: "2026",
    },
    {
      caseNumber: "2026가합11004",
      title: "상속재산 분할 심판",
      description: "피상속인 사망 후 공동상속인 간 상속재산 분할 청구",
      clientId: clientIds[10],
      assignedUserId: minaId,
      status: "active",
      category: "가사",
      courtName: "서울가정법원",
      caseYear: "2026",
    },
    {
      caseNumber: "2026가합11005",
      title: "프랜차이즈 계약 분쟁",
      description: "가맹본부의 영업지역 침해 및 계약 위반에 따른 손해배상 청구",
      clientId: clientIds[11],
      assignedUserId: minaId,
      status: "pending",
      category: "상사",
      courtName: "서울중앙지방법원",
      caseYear: "2026",
    },
  ]

  const caseIds: string[] = []
  for (const c of casesData) {
    const existing = await prisma.case.findUnique({ where: { caseNumber: c.caseNumber } })
    if (!existing) {
      const created = await prisma.case.create({ data: c })
      caseIds.push(created.id)
    } else {
      caseIds.push(existing.id)
    }
  }
  console.log(`✅ Cases: ${caseIds.length}건`)

  // ── Deadlines (10개) ──────────────────────────────────
  const deadlinesData = [
    {
      caseId: caseIds[0],
      title: "1차 변론기일",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
      deadlineType: "변론기일",
      status: "pending",
    },
    {
      caseId: caseIds[1],
      title: "준비서면 제출",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
      deadlineType: "준비서면 제출",
      status: "pending",
    },
    {
      caseId: caseIds[2],
      title: "2차 변론기일",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8),
      deadlineType: "변론기일",
      status: "pending",
    },
    {
      caseId: caseIds[3],
      title: "항소이유서 제출",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14),
      deadlineType: "항소장 제출",
      status: "pending",
    },
    {
      caseId: caseIds[4],
      title: "조정기일",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
      deadlineType: "조정기일",
      status: "pending",
    },
    {
      caseId: caseIds[5],
      title: "감정인 신청 기한",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
      deadlineType: "기타",
      status: "pending",
    },
    {
      caseId: caseIds[6],
      title: "선고기일",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 21),
      deadlineType: "선고기일",
      status: "pending",
    },
    {
      caseId: caseIds[7],
      title: "증거서류 제출",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
      deadlineType: "준비서면 제출",
      status: "pending",
    },
    {
      caseId: caseIds[0],
      title: "답변서 제출",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
      deadlineType: "기타",
      status: "completed",
    },
    {
      caseId: caseIds[8],
      title: "화해권고결정 수락 기한",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
      deadlineType: "화해기일",
      status: "pending",
    },
    // ── Mina Jung 기일 ──
    {
      caseId: caseIds[10],
      title: "저작권 침해 1차 변론기일",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6),
      deadlineType: "변론기일",
      status: "pending",
    },
    {
      caseId: caseIds[11],
      title: "성희롱 사건 증거보전 신청 기한",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
      deadlineType: "기타",
      status: "pending",
    },
    {
      caseId: caseIds[12],
      title: "개인정보 집단소송 준비서면 제출",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12),
      deadlineType: "준비서면 제출",
      status: "pending",
    },
    {
      caseId: caseIds[13],
      title: "상속재산 심판 조정기일",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 9),
      deadlineType: "조정기일",
      status: "pending",
    },
    {
      caseId: caseIds[14],
      title: "프랜차이즈 사건 답변서 제출",
      dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4),
      deadlineType: "기타",
      status: "pending",
    },
  ]

  let deadlineCount = 0
  for (const d of deadlinesData) {
    const existing = await prisma.deadline.findFirst({
      where: { caseId: d.caseId, title: d.title },
    })
    if (!existing) {
      await prisma.deadline.create({ data: d })
      deadlineCount++
    }
  }
  console.log(`✅ Deadlines: ${deadlineCount}개 생성`)

  // ── Documents (10개) ──────────────────────────────────
  const documentsData = [
    { caseId: caseIds[0], fileName: "소장_대여금반환.pdf", docType: "소장", mimeType: "application/pdf", fileSize: 245760 },
    { caseId: caseIds[0], fileName: "차용증_홍길동.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 102400 },
    { caseId: caseIds[1], fileName: "고소장_업무상횡령.pdf", docType: "고소장", mimeType: "application/pdf", fileSize: 358400 },
    { caseId: caseIds[2], fileName: "임대차계약서.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 184320 },
    { caseId: caseIds[3], fileName: "교통사고_진단서.pdf", docType: "의견서", mimeType: "application/pdf", fileSize: 512000 },
    { caseId: caseIds[4], fileName: "공급계약서_한국무역.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 307200 },
    { caseId: caseIds[5], fileName: "상표등록증.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 153600 },
    { caseId: caseIds[6], fileName: "임금지급대장.xlsx", docType: "기타", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileSize: 204800 },
    { caseId: caseIds[7], fileName: "도급계약서_신흥건설.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 430080 },
    { caseId: caseIds[8], fileName: "주주간협약서.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 276480 },
    // ── Mina Jung 문서 ──
    { caseId: caseIds[10], fileName: "저작권등록증_원고.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 184320 },
    { caseId: caseIds[11], fileName: "성희롱_피해진술서.pdf", docType: "의견서", mimeType: "application/pdf", fileSize: 92160 },
    { caseId: caseIds[12], fileName: "개인정보유출_피해사실확인서.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 307200 },
    { caseId: caseIds[13], fileName: "상속재산_목록_및_감정서.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 409600 },
    { caseId: caseIds[14], fileName: "프랜차이즈_가맹계약서.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 358400 },
  ]

  let docCount = 0
  for (const d of documentsData) {
    const existing = await prisma.document.findFirst({
      where: { caseId: d.caseId, fileName: d.fileName },
    })
    if (!existing) {
      await prisma.document.create({
        data: {
          ...d,
          uploadedBy: adminId,
          fileUrl: `[stored:${d.fileName}]`,
          aiSummary: null,
          riskLevel: null,
        },
      })
      docCount++
    }
  }
  console.log(`✅ Documents: ${docCount}개 생성`)

  // ── BillingEntries (10개) ─────────────────────────────
  const billingData = [
    { caseId: caseIds[0], userId: lawyer1Id, description: "소장 작성 및 제출", hours: 3.0, hourlyRate: 300000, date: new Date("2025-02-10") },
    { caseId: caseIds[0], userId: lawyer1Id, description: "1차 변론 준비 및 출석", hours: 2.5, hourlyRate: 300000, date: new Date("2025-02-20") },
    { caseId: caseIds[1], userId: lawyer1Id, description: "고소장 작성", hours: 4.0, hourlyRate: 350000, date: new Date("2025-01-15") },
    { caseId: caseIds[1], userId: lawyer1Id, description: "수사기관 동행", hours: 3.0, hourlyRate: 350000, date: new Date("2025-02-05") },
    { caseId: caseIds[2], userId: lawyer2Id, description: "내용증명 발송 및 소장 작성", hours: 2.0, hourlyRate: 280000, date: new Date("2025-02-12") },
    { caseId: caseIds[3], userId: lawyer2Id, description: "항소이유서 작성", hours: 5.0, hourlyRate: 280000, date: new Date("2025-02-18") },
    { caseId: caseIds[4], userId: lawyer1Id, description: "계약 검토 및 법률 의견서 작성", hours: 3.5, hourlyRate: 300000, date: new Date("2025-01-28") },
    { caseId: caseIds[5], userId: lawyer1Id, description: "상표권 침해 분석 및 가처분 신청", hours: 6.0, hourlyRate: 350000, date: new Date("2025-02-03") },
    { caseId: caseIds[6], userId: lawyer2Id, description: "임금 체불 진정서 작성 및 제출", hours: 2.0, hourlyRate: 280000, date: new Date("2025-02-14") },
    { caseId: caseIds[8], userId: lawyer2Id, description: "주주총회 의사록 검토 및 소 제기", hours: 4.5, hourlyRate: 320000, date: new Date("2025-02-22") },
    // ── Mina Jung 청구 ──
    { caseId: caseIds[10], userId: minaId, description: "저작권 침해 사실 조사 및 소장 작성", hours: 4.0, hourlyRate: 320000, date: new Date("2026-02-10") },
    { caseId: caseIds[11], userId: minaId, description: "성희롱 피해자 상담 및 증거 수집", hours: 3.0, hourlyRate: 300000, date: new Date("2026-02-15") },
    { caseId: caseIds[12], userId: minaId, description: "개인정보 유출 피해 분석 및 집단소송 준비", hours: 6.0, hourlyRate: 320000, date: new Date("2026-02-20") },
    { caseId: caseIds[13], userId: minaId, description: "상속재산 목록 작성 및 심판 청구서 제출", hours: 3.5, hourlyRate: 300000, date: new Date("2026-02-25") },
    { caseId: caseIds[14], userId: minaId, description: "프랜차이즈 계약 검토 및 내용증명 발송", hours: 2.5, hourlyRate: 320000, date: new Date("2026-03-01") },
  ]

  let billingCount = 0
  for (const b of billingData) {
    const existing = await prisma.billingEntry.findFirst({
      where: { caseId: b.caseId, description: b.description },
    })
    if (!existing) {
      await prisma.billingEntry.create({
        data: { ...b, amount: Math.round(b.hours * b.hourlyRate) },
      })
      billingCount++
    }
  }
  console.log(`✅ BillingEntries: ${billingCount}개 생성`)

  // ── Conversations (10개) ──────────────────────────────
  const conversationsData = [
    { title: "대여금 반환 소송 전략 검토", userId: adminId },
    { title: "업무상 횡령 증거 수집 방법", userId: adminId },
    { title: "부동산 명도 절차 질문", userId: adminId },
    { title: "교통사고 손해배상 계산", userId: lawyer1Id },
    { title: "계약 해제 요건 분석", userId: lawyer1Id },
    { title: "상표권 침해 판례 검색", userId: lawyer1Id },
    { title: "임금 체불 관련 법령 확인", userId: lawyer2Id },
    { title: "건설 하자보수 책임 기간", userId: lawyer2Id },
    { title: "주주간 분쟁 조정 방법", userId: lawyer2Id },
    { title: "이혼 재산분할 기준 문의", userId: adminId },
    // ── Mina Jung 대화 ──
    { title: "저작권 침해 입증 요건 검토", userId: minaId },
    { title: "직장 내 성희롱 관련 판례 분석", userId: minaId },
    { title: "개인정보보호법 위반 손해배상 기준", userId: minaId },
    { title: "상속 한정승인 절차 문의", userId: minaId },
    { title: "프랜차이즈 영업지역 보호 규정", userId: minaId },
  ]

  let convCount = 0
  for (const c of conversationsData) {
    const existing = await prisma.conversation.findFirst({
      where: { userId: c.userId, title: c.title },
    })
    if (!existing) {
      const conv = await prisma.conversation.create({ data: c })
      // 샘플 메시지 1개씩
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: "user",
          content: `${c.title}에 대해 알려주세요.`,
        },
      })
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          role: "assistant",
          content: `${c.title} 관련하여 검토하겠습니다. 추가 정보가 있으시면 말씀해주세요.`,
        },
      })
      convCount++
    }
  }
  console.log(`✅ Conversations: ${convCount}개 생성`)

  // ── Additional Clients (for new cases) ────────────────
  const additionalClientsData = [
    { name: "윤재호", email: "yoon@example.com", phone: "010-1111-2222", type: "individual" },
    { name: "한빛솔라(주)", email: "ceo@hanvitsolar.kr", phone: "02-5678-1234", type: "corporate" },
    { name: "문성준", email: "moon@example.com", phone: "010-2222-3333", type: "individual" },
    { name: "나라물산 주식회사", email: "legal@naratrade.kr", phone: "031-456-7890", type: "corporate" },
    { name: "백지수", email: "baek@example.com", phone: "010-3333-4444", type: "individual" },
    { name: "서진호", email: "seo@example.com", phone: "010-4444-5555", type: "individual" },
    { name: "한울병원", email: "legal@hanul.hospital", phone: "02-6789-2345", type: "corporate" },
    { name: "류민아", email: "ryu@example.com", phone: "010-5555-6666", type: "individual" },
    { name: "퓨처테크(주)", email: "ceo@futuretech.kr", phone: "02-7890-3456", type: "corporate" },
    { name: "임채원", email: "im@example.com", phone: "010-6666-7777", type: "individual" },
    { name: "정태영", email: "jtt@example.com", phone: "010-7777-8888", type: "individual" },
    { name: "그린에너지(주)", email: "legal@greenenergy.kr", phone: "02-8901-4567", type: "corporate" },
    { name: "손예림", email: "son@example.com", phone: "010-8888-9999", type: "individual" },
    { name: "디지털헬스(주)", email: "ceo@digitalhealth.kr", phone: "02-9012-5678", type: "corporate" },
    { name: "황민철", email: "hwang@example.com", phone: "010-9999-0000", type: "individual" },
  ]

  const addClientIds: string[] = []
  for (const c of additionalClientsData) {
    const existing = await prisma.client.findFirst({ where: { firmId: firm.id, name: c.name } })
    if (!existing) {
      const created = await prisma.client.create({ data: { firmId: firm.id, ...c } })
      addClientIds.push(created.id)
    } else {
      addClientIds.push(existing.id)
    }
  }
  console.log(`✅ Additional Clients: ${addClientIds.length}명`)

  // ── Admin Cases (10건) ────────────────────────────────
  const adminCasesData = [
    { caseNumber: "2026가합20001", title: "사해행위취소 소송", description: "채무자의 부동산 이전행위 취소 및 원상회복 청구", clientId: addClientIds[0], assignedUserId: adminId, status: "active", category: "민사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합20002", title: "보험금 지급 청구", description: "교통사고 보험회사의 보험금 지급 거부에 대한 청구 소송", clientId: addClientIds[2], assignedUserId: adminId, status: "active", category: "보험", courtName: "서울남부지방법원", caseYear: "2026" },
    { caseNumber: "2026가합20003", title: "명예훼손 손해배상", description: "SNS상 허위사실 유포로 인한 명예훼손 손해배상 청구", clientId: addClientIds[4], assignedUserId: adminId, status: "active", category: "민사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026형제20004", title: "배임 사건", description: "기업 이사의 배임행위에 대한 형사 고소 사건", clientId: addClientIds[1], assignedUserId: adminId, status: "active", category: "형사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합20005", title: "유언장 효력 분쟁", description: "유언장 위조 주장에 따른 유언무효 확인 소송", clientId: addClientIds[5], assignedUserId: adminId, status: "active", category: "가사", courtName: "서울가정법원", caseYear: "2026" },
    { caseNumber: "2026가합20006", title: "토지 경계 분쟁", description: "인접 토지 소유자 간 경계침범에 따른 손해배상 및 원상회복", clientId: addClientIds[7], assignedUserId: adminId, status: "active", category: "민사", courtName: "수원지방법원", caseYear: "2026" },
    { caseNumber: "2026가합20007", title: "의료 과실 손해배상", description: "수술 중 의료과실로 인한 후유증 손해배상 청구", clientId: addClientIds[6], assignedUserId: adminId, status: "active", category: "의료", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합20008", title: "가맹계약 해지 분쟁", description: "가맹본부의 일방적 계약해지에 따른 위약금 및 손해배상", clientId: addClientIds[3], assignedUserId: adminId, status: "pending", category: "상사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합20009", title: "부당해고 구제 신청", description: "정리해고 요건 미충족으로 인한 부당해고 구제 및 복직 청구", clientId: addClientIds[9], assignedUserId: adminId, status: "active", category: "노동", courtName: "서울행정법원", caseYear: "2026" },
    { caseNumber: "2026가합20010", title: "환경오염 손해배상", description: "공장 폐수 방류로 인한 인근 주민 손해배상 집단소송", clientId: addClientIds[11], assignedUserId: adminId, status: "active", category: "환경", courtName: "인천지방법원", caseYear: "2026" },
  ]

  const adminCaseIds: string[] = []
  for (const c of adminCasesData) {
    const existing = await prisma.case.findUnique({ where: { caseNumber: c.caseNumber } })
    if (!existing) {
      const created = await prisma.case.create({ data: c })
      adminCaseIds.push(created.id)
    } else {
      adminCaseIds.push(existing.id)
    }
  }
  console.log(`✅ Admin Cases: ${adminCaseIds.length}건`)

  // ── Jay Park Cases (10건) ─────────────────────────────
  const jayParkCasesData = [
    { caseNumber: "2026가합30001", title: "채무불이행 손해배상", description: "용역계약 불이행으로 인한 손해배상 및 계약금 반환 청구", clientId: addClientIds[8], assignedUserId: jayParkId, status: "active", category: "민사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합30002", title: "투자계약 분쟁", description: "VC 투자계약 조건 위반에 따른 손해배상 청구", clientId: addClientIds[1], assignedUserId: jayParkId, status: "active", category: "상사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합30003", title: "특허권 침해", description: "경쟁사의 무단 기술 도용에 따른 특허권 침해 금지 및 손해배상", clientId: addClientIds[8], assignedUserId: jayParkId, status: "active", category: "지식재산", courtName: "특허법원", caseYear: "2026" },
    { caseNumber: "2026가합30004", title: "부동산 매매계약 해제", description: "계약조건 불이행에 따른 매매계약 해제 및 계약금 배액상환 청구", clientId: addClientIds[10], assignedUserId: jayParkId, status: "active", category: "민사", courtName: "서울남부지방법원", caseYear: "2026" },
    { caseNumber: "2026가합30005", title: "공사대금 청구", description: "하도급 공사 완료 후 원청업체의 대금 지급 거부에 따른 청구", clientId: addClientIds[12], assignedUserId: jayParkId, status: "active", category: "건설", courtName: "수원지방법원", caseYear: "2026" },
    { caseNumber: "2026가합30006", title: "온라인 사기 피해", description: "가상자산 투자 사기로 인한 손해배상 및 형사고소 병행", clientId: addClientIds[14], assignedUserId: jayParkId, status: "active", category: "형사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합30007", title: "양육비 청구", description: "이혼 후 미지급 양육비 및 향후 양육비 증액 심판 청구", clientId: addClientIds[13], assignedUserId: jayParkId, status: "active", category: "가사", courtName: "서울가정법원", caseYear: "2026" },
    { caseNumber: "2026가합30008", title: "보증채무 이행 청구", description: "주채무자 파산에 따른 연대보증인에 대한 채무이행 청구", clientId: addClientIds[0], assignedUserId: jayParkId, status: "pending", category: "민사", courtName: "서울동부지방법원", caseYear: "2026" },
    { caseNumber: "2026가합30009", title: "퇴직금 청구", description: "위장 도급 근로자의 퇴직금 및 연차수당 미지급 청구", clientId: addClientIds[4], assignedUserId: jayParkId, status: "active", category: "노동", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합30010", title: "불공정 거래행위 손해배상", description: "대기업의 거래상 지위 남용에 따른 손해배상 청구", clientId: addClientIds[3], assignedUserId: jayParkId, status: "active", category: "상사", courtName: "서울고등법원", caseYear: "2026" },
  ]

  const jayParkCaseIds: string[] = []
  for (const c of jayParkCasesData) {
    const existing = await prisma.case.findUnique({ where: { caseNumber: c.caseNumber } })
    if (!existing) {
      const created = await prisma.case.create({ data: c })
      jayParkCaseIds.push(created.id)
    } else {
      jayParkCaseIds.push(existing.id)
    }
  }
  console.log(`✅ Jay Park Cases: ${jayParkCaseIds.length}건`)

  // ── Mina Jung Additional Cases (10건) ─────────────────
  const minaNewCasesData = [
    { caseNumber: "2026가합40001", title: "배우자 학대 보호명령", description: "가정폭력 피해자의 피해자보호명령 및 손해배상 청구", clientId: addClientIds[7], assignedUserId: minaId, status: "active", category: "가사", courtName: "서울가정법원", caseYear: "2026" },
    { caseNumber: "2026가합40002", title: "신탁재산 반환 청구", description: "수탁자의 신탁재산 횡령에 따른 반환 및 손해배상 청구", clientId: addClientIds[9], assignedUserId: minaId, status: "active", category: "민사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합40003", title: "계약직 차별 처우 구제", description: "정규직 대비 계약직 근로자 불합리한 차별 처우 시정 청구", clientId: addClientIds[12], assignedUserId: minaId, status: "active", category: "노동", courtName: "서울행정법원", caseYear: "2026" },
    { caseNumber: "2026가합40004", title: "소셜미디어 명예훼손", description: "유튜브 영상을 통한 허위사실 적시 명예훼손 손해배상", clientId: addClientIds[5], assignedUserId: minaId, status: "active", category: "민사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합40005", title: "학교 폭력 손해배상", description: "학교폭력 피해학생 부모의 가해학생 및 학교법인 손해배상 청구", clientId: addClientIds[13], assignedUserId: minaId, status: "active", category: "민사", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합40006", title: "임금피크제 불이익 변경", description: "취업규칙 불이익 변경 무효 확인 및 임금차액 청구", clientId: addClientIds[2], assignedUserId: minaId, status: "pending", category: "노동", courtName: "서울중앙지방법원", caseYear: "2026" },
    { caseNumber: "2026가합40007", title: "공동사업 탈퇴 정산", description: "동업계약 해지 후 공동사업 이익 정산금 청구", clientId: addClientIds[10], assignedUserId: minaId, status: "active", category: "상사", courtName: "서울남부지방법원", caseYear: "2026" },
    { caseNumber: "2026가합40008", title: "전세금 반환 청구", description: "임대인 파산 위기에 따른 전세보증금 반환 및 보증기관 청구", clientId: addClientIds[4], assignedUserId: minaId, status: "active", category: "민사", courtName: "서울서부지방법원", caseYear: "2026" },
    { caseNumber: "2026가합40009", title: "아동 양육권 변경 심판", description: "부모 일방의 해외이주 계획에 따른 양육권 변경 심판 청구", clientId: addClientIds[6], assignedUserId: minaId, status: "active", category: "가사", courtName: "서울가정법원", caseYear: "2026" },
    { caseNumber: "2026가합40010", title: "소비자 집단피해 구제", description: "식품 이물질 오염으로 인한 소비자 집단피해 손해배상 청구", clientId: addClientIds[14], assignedUserId: minaId, status: "active", category: "소비자", courtName: "서울중앙지방법원", caseYear: "2026" },
  ]

  const minaNewCaseIds: string[] = []
  for (const c of minaNewCasesData) {
    const existing = await prisma.case.findUnique({ where: { caseNumber: c.caseNumber } })
    if (!existing) {
      const created = await prisma.case.create({ data: c })
      minaNewCaseIds.push(created.id)
    } else {
      minaNewCaseIds.push(existing.id)
    }
  }
  console.log(`✅ Mina Jung Additional Cases: ${minaNewCaseIds.length}건`)

  // ── Deadlines for New Cases ───────────────────────────
  const newDeadlinesData = [
    // Admin
    { caseId: adminCaseIds[0], title: "사해행위취소 1차 변론", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3), deadlineType: "변론기일", status: "pending" },
    { caseId: adminCaseIds[1], title: "보험금 청구 준비서면 제출", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7), deadlineType: "준비서면 제출", status: "pending" },
    { caseId: adminCaseIds[2], title: "명예훼손 증거보전 신청 기한", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2), deadlineType: "기타", status: "pending" },
    { caseId: adminCaseIds[3], title: "배임 사건 수사기관 출석", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5), deadlineType: "기타", status: "pending" },
    { caseId: adminCaseIds[4], title: "유언무효 확인 소송 변론기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10), deadlineType: "변론기일", status: "pending" },
    { caseId: adminCaseIds[5], title: "토지 경계 감정신청 기한", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6), deadlineType: "기타", status: "pending" },
    { caseId: adminCaseIds[6], title: "의료과실 전문가 감정 기한", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14), deadlineType: "기타", status: "pending" },
    { caseId: adminCaseIds[7], title: "가맹계약 조정기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 9), deadlineType: "조정기일", status: "pending" },
    { caseId: adminCaseIds[8], title: "부당해고 행정소송 변론기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 11), deadlineType: "변론기일", status: "pending" },
    { caseId: adminCaseIds[9], title: "환경오염 집단소송 1차 변론", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 16), deadlineType: "변론기일", status: "pending" },
    // Jay Park
    { caseId: jayParkCaseIds[0], title: "채무불이행 소장 제출", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4), deadlineType: "기타", status: "pending" },
    { caseId: jayParkCaseIds[1], title: "투자계약 분쟁 조정기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8), deadlineType: "조정기일", status: "pending" },
    { caseId: jayParkCaseIds[2], title: "특허 침해 가처분 신청 기한", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), deadlineType: "기타", status: "pending" },
    { caseId: jayParkCaseIds[3], title: "부동산 매매 1차 변론기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 12), deadlineType: "변론기일", status: "pending" },
    { caseId: jayParkCaseIds[4], title: "공사대금 증거서류 제출", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6), deadlineType: "준비서면 제출", status: "pending" },
    { caseId: jayParkCaseIds[5], title: "온라인 사기 형사 고소 기한", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3), deadlineType: "기타", status: "pending" },
    { caseId: jayParkCaseIds[6], title: "양육비 심판 조정기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15), deadlineType: "조정기일", status: "pending" },
    { caseId: jayParkCaseIds[7], title: "보증채무 답변서 제출", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5), deadlineType: "기타", status: "pending" },
    { caseId: jayParkCaseIds[8], title: "퇴직금 청구 변론기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 20), deadlineType: "변론기일", status: "pending" },
    { caseId: jayParkCaseIds[9], title: "불공정거래 항소심 변론기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 18), deadlineType: "변론기일", status: "pending" },
    // Mina new
    { caseId: minaNewCaseIds[0], title: "보호명령 심문기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2), deadlineType: "변론기일", status: "pending" },
    { caseId: minaNewCaseIds[1], title: "신탁재산 반환 소장 접수", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7), deadlineType: "기타", status: "pending" },
    { caseId: minaNewCaseIds[2], title: "차별시정 조정기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10), deadlineType: "조정기일", status: "pending" },
    { caseId: minaNewCaseIds[3], title: "명예훼손 가처분 심문", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4), deadlineType: "변론기일", status: "pending" },
    { caseId: minaNewCaseIds[4], title: "학교폭력 손해배상 1차 변론", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 13), deadlineType: "변론기일", status: "pending" },
    { caseId: minaNewCaseIds[5], title: "임금피크제 소장 제출 기한", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5), deadlineType: "기타", status: "pending" },
    { caseId: minaNewCaseIds[6], title: "공동사업 정산 조정기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 9), deadlineType: "조정기일", status: "pending" },
    { caseId: minaNewCaseIds[7], title: "전세금 반환 소장 접수", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3), deadlineType: "기타", status: "pending" },
    { caseId: minaNewCaseIds[8], title: "양육권 변경 심판기일", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 17), deadlineType: "변론기일", status: "pending" },
    { caseId: minaNewCaseIds[9], title: "소비자 집단피해 준비서면", dueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 11), deadlineType: "준비서면 제출", status: "pending" },
  ]

  let newDeadlineCount = 0
  for (const d of newDeadlinesData) {
    const existing = await prisma.deadline.findFirst({ where: { caseId: d.caseId, title: d.title } })
    if (!existing) {
      await prisma.deadline.create({ data: d })
      newDeadlineCount++
    }
  }
  console.log(`✅ New Deadlines: ${newDeadlineCount}개 생성`)

  // ── Documents for New Cases ───────────────────────────
  const newDocumentsData = [
    // Admin
    { caseId: adminCaseIds[0], uploadedBy: adminId, fileName: "사해행위취소_소장.pdf", docType: "소장", mimeType: "application/pdf", fileSize: 256000 },
    { caseId: adminCaseIds[1], uploadedBy: adminId, fileName: "보험계약서_및_청구서류.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 184320 },
    { caseId: adminCaseIds[2], uploadedBy: adminId, fileName: "명예훼손_게시물_캡처.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 102400 },
    { caseId: adminCaseIds[3], uploadedBy: adminId, fileName: "배임행위_회계장부.xlsx", docType: "기타", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileSize: 307200 },
    { caseId: adminCaseIds[4], uploadedBy: adminId, fileName: "유언장_원본_사본.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 153600 },
    { caseId: adminCaseIds[5], uploadedBy: adminId, fileName: "토지대장_및_경계측량도.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 512000 },
    { caseId: adminCaseIds[6], uploadedBy: adminId, fileName: "의료기록_및_진단서.pdf", docType: "의견서", mimeType: "application/pdf", fileSize: 409600 },
    { caseId: adminCaseIds[7], uploadedBy: adminId, fileName: "가맹계약서_해지통보서.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 276480 },
    { caseId: adminCaseIds[8], uploadedBy: adminId, fileName: "해고통보서_및_취업규칙.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 204800 },
    { caseId: adminCaseIds[9], uploadedBy: adminId, fileName: "환경오염_피해현황보고서.pdf", docType: "의견서", mimeType: "application/pdf", fileSize: 614400 },
    // Jay Park
    { caseId: jayParkCaseIds[0], uploadedBy: jayParkId, fileName: "용역계약서_채무불이행.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 245760 },
    { caseId: jayParkCaseIds[1], uploadedBy: jayParkId, fileName: "투자계약서_VC.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 358400 },
    { caseId: jayParkCaseIds[2], uploadedBy: jayParkId, fileName: "특허등록증_침해증거.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 184320 },
    { caseId: jayParkCaseIds[3], uploadedBy: jayParkId, fileName: "부동산매매계약서.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 307200 },
    { caseId: jayParkCaseIds[4], uploadedBy: jayParkId, fileName: "하도급계약서_공사완료확인서.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 430080 },
    { caseId: jayParkCaseIds[5], uploadedBy: jayParkId, fileName: "가상자산_거래내역_증빙.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 153600 },
    { caseId: jayParkCaseIds[6], uploadedBy: jayParkId, fileName: "이혼판결문_양육비합의서.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 204800 },
    { caseId: jayParkCaseIds[7], uploadedBy: jayParkId, fileName: "연대보증계약서.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 122880 },
    { caseId: jayParkCaseIds[8], uploadedBy: jayParkId, fileName: "근로계약서_급여명세서.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 245760 },
    { caseId: jayParkCaseIds[9], uploadedBy: jayParkId, fileName: "불공정거래_거래내역서.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 358400 },
    // Mina new
    { caseId: minaNewCaseIds[0], uploadedBy: minaId, fileName: "가정폭력_피해진단서.pdf", docType: "의견서", mimeType: "application/pdf", fileSize: 92160 },
    { caseId: minaNewCaseIds[1], uploadedBy: minaId, fileName: "신탁계약서_재산목록.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 307200 },
    { caseId: minaNewCaseIds[2], uploadedBy: minaId, fileName: "근로조건_차별비교표.xlsx", docType: "기타", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileSize: 204800 },
    { caseId: minaNewCaseIds[3], uploadedBy: minaId, fileName: "유튜브_허위영상_녹취록.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 184320 },
    { caseId: minaNewCaseIds[4], uploadedBy: minaId, fileName: "학교폭력_사실확인서.pdf", docType: "의견서", mimeType: "application/pdf", fileSize: 153600 },
    { caseId: minaNewCaseIds[5], uploadedBy: minaId, fileName: "취업규칙_임금피크제_변경안.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 276480 },
    { caseId: minaNewCaseIds[6], uploadedBy: minaId, fileName: "동업계약서_수익정산내역.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 245760 },
    { caseId: minaNewCaseIds[7], uploadedBy: minaId, fileName: "임대차계약서_전세보증보험.pdf", docType: "계약서", mimeType: "application/pdf", fileSize: 307200 },
    { caseId: minaNewCaseIds[8], uploadedBy: minaId, fileName: "양육권현황_아동생활환경보고서.pdf", docType: "의견서", mimeType: "application/pdf", fileSize: 358400 },
    { caseId: minaNewCaseIds[9], uploadedBy: minaId, fileName: "식품이물질_검사성적서.pdf", docType: "기타", mimeType: "application/pdf", fileSize: 204800 },
  ]

  let newDocCount = 0
  for (const d of newDocumentsData) {
    const existing = await prisma.document.findFirst({ where: { caseId: d.caseId, fileName: d.fileName } })
    if (!existing) {
      await prisma.document.create({
        data: { ...d, fileUrl: `[stored:${d.fileName}]`, aiSummary: null, riskLevel: null },
      })
      newDocCount++
    }
  }
  console.log(`✅ New Documents: ${newDocCount}개 생성`)

  // ── BillingEntries for New Cases ──────────────────────
  const newBillingData = [
    // Admin
    { caseId: adminCaseIds[0], userId: adminId, description: "사해행위취소 소장 작성 및 제출", hours: 3.5, hourlyRate: 400000, date: new Date("2026-02-05") },
    { caseId: adminCaseIds[1], userId: adminId, description: "보험금 청구 법률 검토 및 준비서면", hours: 2.5, hourlyRate: 400000, date: new Date("2026-02-08") },
    { caseId: adminCaseIds[2], userId: adminId, description: "명예훼손 가처분 신청서 작성", hours: 3.0, hourlyRate: 400000, date: new Date("2026-02-12") },
    { caseId: adminCaseIds[3], userId: adminId, description: "배임사건 고소장 작성 및 수사기관 제출", hours: 4.0, hourlyRate: 450000, date: new Date("2026-02-15") },
    { caseId: adminCaseIds[4], userId: adminId, description: "유언무효 법률 검토 및 소장 작성", hours: 3.0, hourlyRate: 400000, date: new Date("2026-02-18") },
    { caseId: adminCaseIds[5], userId: adminId, description: "토지경계 측량 감정 신청 및 현장 확인", hours: 2.0, hourlyRate: 400000, date: new Date("2026-02-20") },
    { caseId: adminCaseIds[6], userId: adminId, description: "의료과실 전문가 의견 검토 및 소장 작성", hours: 5.0, hourlyRate: 450000, date: new Date("2026-02-22") },
    { caseId: adminCaseIds[7], userId: adminId, description: "가맹계약 해지 법률 검토 및 내용증명 발송", hours: 2.5, hourlyRate: 400000, date: new Date("2026-02-25") },
    { caseId: adminCaseIds[8], userId: adminId, description: "부당해고 행정소송 소장 작성", hours: 3.5, hourlyRate: 400000, date: new Date("2026-03-01") },
    { caseId: adminCaseIds[9], userId: adminId, description: "환경오염 집단소송 원고 모집 및 소장 작성", hours: 6.0, hourlyRate: 450000, date: new Date("2026-03-03") },
    // Jay Park
    { caseId: jayParkCaseIds[0], userId: jayParkId, description: "용역계약 불이행 법률 검토 및 내용증명", hours: 2.0, hourlyRate: 350000, date: new Date("2026-02-06") },
    { caseId: jayParkCaseIds[1], userId: jayParkId, description: "투자계약서 검토 및 위반사항 분석", hours: 4.0, hourlyRate: 350000, date: new Date("2026-02-10") },
    { caseId: jayParkCaseIds[2], userId: jayParkId, description: "특허 침해 가처분 신청서 작성", hours: 5.0, hourlyRate: 400000, date: new Date("2026-02-13") },
    { caseId: jayParkCaseIds[3], userId: jayParkId, description: "매매계약 해제 소장 작성 및 제출", hours: 3.0, hourlyRate: 350000, date: new Date("2026-02-16") },
    { caseId: jayParkCaseIds[4], userId: jayParkId, description: "하도급 공사대금 청구 소장 작성", hours: 2.5, hourlyRate: 350000, date: new Date("2026-02-19") },
    { caseId: jayParkCaseIds[5], userId: jayParkId, description: "가상자산 사기 고소장 작성 및 제출", hours: 3.5, hourlyRate: 350000, date: new Date("2026-02-21") },
    { caseId: jayParkCaseIds[6], userId: jayParkId, description: "양육비 증액 심판 청구서 작성", hours: 2.5, hourlyRate: 320000, date: new Date("2026-02-24") },
    { caseId: jayParkCaseIds[7], userId: jayParkId, description: "연대보증 채무이행 청구 소장 작성", hours: 2.0, hourlyRate: 350000, date: new Date("2026-02-27") },
    { caseId: jayParkCaseIds[8], userId: jayParkId, description: "위장도급 근로자 퇴직금 청구 준비", hours: 3.5, hourlyRate: 350000, date: new Date("2026-03-02") },
    { caseId: jayParkCaseIds[9], userId: jayParkId, description: "불공정거래 손해배상 항소이유서 작성", hours: 4.5, hourlyRate: 400000, date: new Date("2026-03-05") },
    // Mina new
    { caseId: minaNewCaseIds[0], userId: minaId, description: "가정폭력 피해자 보호명령 신청서 작성", hours: 2.5, hourlyRate: 320000, date: new Date("2026-02-07") },
    { caseId: minaNewCaseIds[1], userId: minaId, description: "신탁재산 횡령 조사 및 소장 작성", hours: 3.5, hourlyRate: 320000, date: new Date("2026-02-11") },
    { caseId: minaNewCaseIds[2], userId: minaId, description: "차별시정 진정서 및 행정소송 준비", hours: 3.0, hourlyRate: 320000, date: new Date("2026-02-14") },
    { caseId: minaNewCaseIds[3], userId: minaId, description: "유튜브 명예훼손 가처분 신청서 작성", hours: 2.5, hourlyRate: 320000, date: new Date("2026-02-17") },
    { caseId: minaNewCaseIds[4], userId: minaId, description: "학교폭력 피해 손해배상 소장 작성", hours: 3.0, hourlyRate: 320000, date: new Date("2026-02-21") },
    { caseId: minaNewCaseIds[5], userId: minaId, description: "임금피크제 불이익 변경 무효 소장 작성", hours: 4.0, hourlyRate: 320000, date: new Date("2026-02-24") },
    { caseId: minaNewCaseIds[6], userId: minaId, description: "동업계약 정산금 청구 소장 작성", hours: 2.5, hourlyRate: 320000, date: new Date("2026-02-27") },
    { caseId: minaNewCaseIds[7], userId: minaId, description: "전세금 반환 소장 및 보증기관 청구서 작성", hours: 3.0, hourlyRate: 320000, date: new Date("2026-03-01") },
    { caseId: minaNewCaseIds[8], userId: minaId, description: "양육권 변경 심판 청구서 및 의견서 작성", hours: 3.5, hourlyRate: 320000, date: new Date("2026-03-04") },
    { caseId: minaNewCaseIds[9], userId: minaId, description: "소비자 집단피해 원고 모집 및 소장 작성", hours: 5.0, hourlyRate: 350000, date: new Date("2026-03-06") },
  ]

  let newBillingCount = 0
  for (const b of newBillingData) {
    const existing = await prisma.billingEntry.findFirst({ where: { caseId: b.caseId, description: b.description } })
    if (!existing) {
      await prisma.billingEntry.create({
        data: { ...b, amount: Math.round(b.hours * b.hourlyRate) },
      })
      newBillingCount++
    }
  }
  console.log(`✅ New BillingEntries: ${newBillingCount}개 생성`)

  // ── Conversations for New Cases ───────────────────────
  const newConversationsData = [
    { title: "사해행위취소 소송 전략", userId: adminId },
    { title: "보험금 지급 거부 대응 방안", userId: adminId },
    { title: "배임죄 구성요건 검토", userId: adminId },
    { title: "의료과실 전문가 감정 절차", userId: adminId },
    { title: "환경오염 집단소송 원고 자격 요건", userId: adminId },
    { title: "특허 침해 가처분 요건 분석", userId: jayParkId },
    { title: "가상자산 사기 수사기관 대응 전략", userId: jayParkId },
    { title: "위장도급 법적 판단 기준", userId: jayParkId },
    { title: "불공정거래행위 손해액 산정 방법", userId: jayParkId },
    { title: "양육비 증액 심판 관련 판례 검토", userId: jayParkId },
    { title: "가정폭력 피해자 보호명령 절차", userId: minaId },
    { title: "임금피크제 불이익 변경 법리 검토", userId: minaId },
    { title: "소비자 집단피해 소송 진행 전략", userId: minaId },
    { title: "아동 양육권 변경 심판 기준", userId: minaId },
    { title: "학교폭력 가해자 책임 범위", userId: minaId },
  ]

  let newConvCount = 0
  for (const c of newConversationsData) {
    const existing = await prisma.conversation.findFirst({ where: { userId: c.userId, title: c.title } })
    if (!existing) {
      const conv = await prisma.conversation.create({ data: c })
      await prisma.message.create({
        data: { conversationId: conv.id, role: "user", content: `${c.title}에 대해 알려주세요.` },
      })
      await prisma.message.create({
        data: { conversationId: conv.id, role: "assistant", content: `${c.title} 관련하여 검토하겠습니다. 추가 정보가 있으시면 말씀해주세요.` },
      })
      newConvCount++
    }
  }
  console.log(`✅ New Conversations: ${newConvCount}개 생성`)

  // ── LawKnowledge (지식베이스 10개) ───────────────────────
  const knowledgeData = [
    {
      title: "민법 제390조 – 채무불이행과 손해배상",
      content: `채무자가 채무의 내용에 좇은 이행을 하지 아니한 때에는 채권자는 손해배상을 청구할 수 있다. 그러나 채무자의 고의나 과실 없이 이행할 수 없게 된 때에는 그러하지 아니하다.

[실무 요점]
1. 손해배상 청구 요건: ① 채무불이행 사실, ② 손해의 발생, ③ 채무불이행과 손해 간 인과관계
2. 귀책사유(고의·과실) 입증책임: 채무자가 귀책사유 없음을 증명해야 함
3. 이행불능·이행지체·불완전이행의 세 유형 구분 필요
4. 손해배상 범위: 통상손해(민법 제393조 제1항) + 특별손해(예견가능성 있는 경우)`,
      docType: "법령",
      practiceArea: "민사",
      metadata: { source: "민법", article: "제390조", tags: ["채무불이행", "손해배상", "귀책사유"] },
    },
    {
      title: "대법원 판례 – 매매계약 해제와 이행의 착수 기준",
      content: `대법원 2022. 11. 20. 선고 2022나301234 판결

[판시사항]
매매계약의 해제에 있어서 '이행의 착수'란 객관적으로 외부에서 인식할 수 있는 정도로 채무의 이행행위의 일부를 하거나 이행을 위하여 필요한 전제행위를 하는 것을 말한다.

[판결 요지]
① 계약금 수령 후 매도인이 잔금 지급 준비를 마친 경우 이행 착수로 봄
② 이행 착수 전에는 계약금의 배액을 상환하고 계약 해제 가능 (민법 제565조)
③ 이행 착수 후에는 상대방의 동의 없이 일방적 해제 불가

[실무 활용]
- 부동산 매매 분쟁 시 이행착수 시점이 계약금 반환/배상 여부 결정의 핵심
- 잔금 지급일 전 매도인의 소유권이전 서류 준비도 이행착수로 인정될 수 있음`,
      docType: "판례",
      practiceArea: "민사",
      metadata: { courtName: "서울고등법원", caseNumber: "2022나301234", judgmentDate: "2022-11-20", tags: ["매매계약", "해제", "이행착수", "계약금"] },
    },
    {
      title: "근로기준법 제23조 – 해고의 제한과 정당한 사유",
      content: `사용자는 근로자에게 정당한 이유 없이 해고, 휴직, 정직, 전직, 감봉, 그 밖의 징벌(이하 '부당해고 등')을 하지 못한다.

[정당한 해고 사유 판단기준 (대법원 판례)]
1. 근로자의 귀책사유: 업무능력 현저한 부족, 비위행위, 무단결근 반복
2. 경영상 해고 요건 (민법 제24조): ① 긴박한 경영상 필요, ② 해고 회피 노력, ③ 합리적·공정한 기준, ④ 근로자 대표와 협의
3. 절차적 요건: 서면 통지 필수 (구두 해고 무효), 30일 전 예고 또는 예고수당 지급

[실무 포인트]
- 부당해고 구제신청 기한: 해고일로부터 3개월 이내 (노동위원회)
- 원직복직 또는 해고기간 동안의 임금 상당액 지급 명령 가능`,
      docType: "법령",
      practiceArea: "노동",
      metadata: { source: "근로기준법", article: "제23조", tags: ["해고", "부당해고", "정당한 사유", "노동"] },
    },
    {
      title: "상표권 침해 금지 청구 실무 가이드",
      content: `[상표권 침해의 성립 요건]
1. 등록상표와 동일·유사한 표장 사용
2. 지정상품과 동일·유사한 상품·서비스에 사용
3. 영업적 사용 (사적 사용 제외)

[금지청구 근거]
상표법 제107조: 상표권자 또는 전용사용권자는 침해행위의 금지 또는 예방을 청구할 수 있음

[손해배상액 산정 방법]
① 상표권자의 실제 손해액
② 침해자가 얻은 이익액 (추정)
③ 통상 사용료 상당액 (최소한의 손해)

[가처분 신청 실무]
- 법원: 서울중앙지방법원 민사합의부 (50부)
- 소명자료: 상표등록증, 침해 증거(온라인 캡처·구매 영수증), 유사도 분석서
- 담보 제공: 통상 청구액의 10~20%

[소멸시효]
침해 사실 및 침해자를 안 날로부터 3년, 침해행위 시부터 10년`,
      docType: "실무가이드",
      practiceArea: "지식재산",
      metadata: { tags: ["상표권", "침해금지", "가처분", "손해배상"] },
    },
    {
      title: "임대차보호법 – 묵시적 갱신과 계약 해지",
      content: `[주택임대차보호법 제6조 – 묵시적 갱신]
임대인이 임대차기간 만료 전 6개월부터 2개월 전까지 갱신거절 통지를 하지 않으면 종전 임대차와 동일 조건으로 갱신된 것으로 봄

[묵시적 갱신 후 해지]
- 임차인은 언제든지 해지 통보 가능 → 통보 후 3개월 후 효력 발생
- 임대인은 임차인이 2기 이상 차임 연체, 무단전대 등 사유가 있어야 해지 가능

[계약갱신요구권 (제6조의3)]
- 임차인은 1회에 한해 갱신 요구 가능 (최대 2년 연장)
- 임대인 거절 사유: 실거주, 재개발·재건축, 임차인의 의무 위반 등
- 거절 후 3개월 내 실거주하지 않으면 손해배상 책임

[전월세 신고제]
보증금 6,000만 원 초과 또는 월세 30만 원 초과 시 계약 체결일로부터 30일 이내 신고 의무`,
      docType: "법령",
      practiceArea: "민사",
      metadata: { source: "주택임대차보호법", tags: ["임대차", "묵시적갱신", "계약갱신요구권", "전세"] },
    },
    {
      title: "형사소송 – 구속영장 청구 및 기각 사유",
      content: `[구속의 요건 (형사소송법 제70조)]
1. 범죄 혐의 상당성
2. 구속 필요성: ① 일정한 주거가 없는 때, ② 증거를 인멸할 염려, ③ 도망하거나 도망할 염려

[구속영장 실질심사]
- 피의자 의견 진술 기회 보장
- 판사가 48시간 이내 발부 여부 결정
- 기각 시 검사는 항고 불가 (즉시항고 대상 아님)

[구속적부심사]
- 구속된 피의자/피고인이 법원에 석방 신청 가능
- 법원은 24시간 이내 심사
- 기각 시 7일 후 재신청 가능

[보석]
- 피고인에 한해 신청 가능 (피의자 불가)
- 보석 허가 요건: 증거인멸·도주 우려 없을 것
- 보석 보증금: 통상 500만 원~수천만 원

[무죄추정의 원칙]
헌법 제27조 제4항: 형사피고인은 유죄 판결 확정 전까지 무죄로 추정`,
      docType: "실무가이드",
      practiceArea: "형사",
      metadata: { tags: ["구속영장", "구속적부심", "보석", "형사소송"] },
    },
    {
      title: "개인정보보호법 위반 손해배상 기준 (2024 개정)",
      content: `[개인정보보호법 제39조 – 손해배상 책임]
개인정보처리자의 고의 또는 과실로 정보주체에게 손해가 발생한 경우 손해액 배상 책임

[법정손해배상 (제39조의2)]
- 실제 손해액 증명 곤란 시 300만 원 이하의 범위에서 법원이 배상액 결정
- 고의·중과실 시 최대 1,000만 원까지 인정 가능

[집단소송 가능 여부]
- 현행법상 개인정보 전용 집단소송 제도 없음
- 민사소송법상 선정당사자 제도 활용 가능

[과징금 부과 (2024 개정)]
- 위반 행위 관련 매출액의 3% 이하
- 매출액 산정 곤란 시 20억 원 이하

[주요 판례 흐름]
- 개인정보 유출 자체만으로 정신적 손해 인정 (대법원 2023)
- 1인당 위자료: 유출 규모·민감도에 따라 10만~100만 원 범위`,
      docType: "법령",
      practiceArea: "민사",
      metadata: { source: "개인정보보호법", tags: ["개인정보", "손해배상", "법정손해배상", "집단소송"] },
    },
    {
      title: "이혼 재산분할 기준 및 기여도 산정",
      content: `[민법 제839조의2 – 재산분할 청구]
협의 또는 심판에 의해 재산분할 청구 가능. 이혼한 날로부터 2년 이내 행사해야 함

[분할 대상 재산]
- 혼인 중 쌍방의 협력으로 형성한 공동재산 (특유재산 제외)
- 소극재산(부채)도 분할 대상 포함
- 퇴직금·연금도 혼인기간 비례분 포함 가능

[기여도 산정 기준]
- 통상 기여도: 결혼 10년 이상은 50%:50% 인정 경향
- 전업주부: 가사노동·양육 기여 인정 (대법원 일관된 태도)
- 경제적 기여: 소득·자산 형성 정도 반영

[위자료와의 구별]
- 재산분할: 기여도에 따른 정산 (유책성 불문)
- 위자료: 혼인파탄에 귀책사유 있는 배우자가 지급 (정신적 손해배상)

[실무 포인트]
- 재산 은닉 의심 시: 금융정보조회, 부동산 등기 열람
- 외국계좌·가상자산 은닉은 조회 한계 있으므로 사전 증거 확보 필수`,
      docType: "실무가이드",
      practiceArea: "가사",
      metadata: { tags: ["이혼", "재산분할", "위자료", "기여도", "가사소송"] },
    },
    {
      title: "건설 도급계약 – 하자담보책임 기간 및 청구 방법",
      content: `[민법 제671조 – 수급인의 담보책임 존속기간]
- 석조·석회조·연와조·금속조 기타 이와 유사한 재료: 10년
- 목조 등 기타 건물·토지의 공작물: 5년
- 기타 공작물 및 목적물: 1년

[건설산업기본법상 하자담보책임 기간]
- 건물의 주요 구조부(기둥·보·벽·슬래브): 10년
- 방수·도장·방음·단열 등: 3년
- 창호공사: 2년

[하자보수 청구 절차]
1. 하자 발생 사실 서면 통지 (내용증명 권고)
2. 수급인에게 상당기간 내 보수 요구
3. 보수 거절·지연 시 제3자 보수비용 청구 또는 손해배상 청구
4. 분쟁조정: 건설분쟁조정위원회 (소송보다 신속·저비용)

[하자 감정]
- 법원 감정인 지정 또는 대한건축사협회 감정 의뢰
- 하자 범위·보수비 산정을 위한 필수 절차

[공사대금과 하자보수의 동시이행]
수급인의 하자보수의무와 도급인의 공사대금 지급의무는 동시이행관계 (대법원 판례)`,
      docType: "실무가이드",
      practiceArea: "건설",
      metadata: { tags: ["건설", "하자담보책임", "도급계약", "하자보수"] },
    },
    {
      title: "소비자 분쟁해결 기준 및 집단피해 구제 절차",
      content: `[소비자기본법 제55조 – 분쟁조정]
소비자분쟁조정위원회에 조정 신청 가능. 조정 성립 시 재판상 화해 효력

[소비자 집단분쟁조정 (제68조)]
- 신청 요건: 동일·유사 피해 소비자 50인 이상
- 한국소비자원 집단분쟁조정 신청
- 결과: 동일한 원인으로 피해 입은 전체 소비자에게 적용

[제조물 책임법 적용]
- 제조물의 결함으로 생명·신체·재산 피해 발생 시 제조업자 책임
- 결함 추정: 정상적 사용 중 손해 발생 시 결함 추정 가능
- 면책사유: 제조 당시 과학·기술 수준으로 결함 인식 불가능한 경우

[소비자 집단소송 활용]
- 증권관련 집단소송법은 있으나 일반 소비자 집단소송법 미비
- 선정당사자 제도 활용 또는 소액다수 개별소송 병행 전략

[식품위생법 위반 시 추가 구제]
식품의약품안전처에 행정처분 민원 → 형사고발 → 민사 손해배상 병행 가능`,
      docType: "실무가이드",
      practiceArea: "소비자",
      metadata: { tags: ["소비자", "집단분쟁", "제조물책임", "분쟁조정"] },
    },
  ]

  let knowledgeCount = 0
  for (const k of knowledgeData) {
    const existing = await prisma.lawKnowledge.findFirst({ where: { title: k.title } })
    if (!existing) {
      await prisma.lawKnowledge.create({
        data: {
          ...k,
          lawyerId: null, // 공유 지식베이스 (모든 사용자 열람 가능)
          chunkIndex: 0,
          totalChunks: 1,
        },
      })
      knowledgeCount++
    }
  }
  console.log(`✅ LawKnowledge (지식베이스): ${knowledgeCount}개 생성`)

  console.log("\n🎉 Seed 완료!")
  console.log("─────────────────────────────")
  console.log("로그인: admin@lexagent.kr / admin1234")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
