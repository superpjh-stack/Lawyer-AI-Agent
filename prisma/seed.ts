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

  const usersData = [
    { name: "관리자", email: "admin@lexagent.kr", role: "admin" },
    { name: "김민준 변호사", email: "minjun@lexagent.kr", role: "lawyer" },
    { name: "이서연 변호사", email: "seoyeon@lexagent.kr", role: "lawyer" },
  ]

  const users: Record<string, string> = {} // email → id
  for (const u of usersData) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (!existing) {
      const created = await prisma.user.create({
        data: { firmId: firm.id, name: u.name, email: u.email, passwordHash: adminHash, role: u.role },
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

  console.log("\n🎉 Seed 완료!")
  console.log("─────────────────────────────")
  console.log("로그인: admin@lexagent.kr / admin1234")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
