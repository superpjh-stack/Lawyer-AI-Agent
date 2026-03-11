"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MessageSquare, ChevronRight, ChevronDown, Loader2, Lightbulb } from "lucide-react";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { Button } from "@/components/ui/Button";
import { RAGToggle } from "@/components/rag/RAGToggle";
import { clsx } from "clsx";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages?: { content: string; createdAt: string }[];
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "오늘";
  if (d === 1) return "어제";
  if (d <= 7) return "이번 주";
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function groupByDate(conversations: Conversation[]) {
  const groups: Record<string, Conversation[]> = {};
  conversations.forEach((c) => {
    const label = relativeDate(c.updatedAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(c);
  });
  return groups;
}

// ── 추천 질문 50개 ──────────────────────────────────────
const QUICK_QUESTIONS = [
  {
    category: "📋 사건 전략",
    questions: [
      "이 사건에서 승소 가능성을 높이기 위한 핵심 전략은?",
      "피고 측의 예상 반론과 대응 방법을 알려줘",
      "유사 판례에서 원고가 승소한 공통 요인은?",
      "화해 또는 조정을 권유해야 할 상황인지 판단해줘",
      "항소심에서 유리한 새로운 주장 포인트는?",
      "소송 전 내용증명으로 해결 가능한 사안인지 검토해줘",
      "집행권원 확보 후 강제집행 절차를 설명해줘",
      "소멸시효 완성 여부 및 중단 사유를 분석해줘",
    ],
  },
  {
    category: "📄 문서 검토",
    questions: [
      "이 계약서의 주요 리스크 조항을 찾아줘",
      "계약 해제·해지 요건이 충족되는지 검토해줘",
      "손해배상 책임 제한 조항의 유효성을 분석해줘",
      "불공정 약관에 해당하는 조항이 있는지 확인해줘",
      "계약서의 관할 조항과 준거법이 적절한지 검토해줘",
      "비밀유지 조항의 범위와 기간이 적정한지 의견줘",
      "이 합의서가 법적으로 유효한지 검토해줘",
      "위임장의 권한 범위가 충분한지 확인해줘",
    ],
  },
  {
    category: "⚖️ 법령·판례 리서치",
    questions: [
      "민법상 불법행위 손해배상 요건을 설명해줘",
      "최근 5년간 대법원 사기죄 인정 기준 판례를 찾아줘",
      "횡령과 배임의 법적 차이점과 처벌 기준은?",
      "부동산 임대차보호법의 대항력 요건을 정리해줘",
      "근로기준법상 부당해고 구제 절차를 알려줘",
      "명예훼손죄 성립 요건과 사실 적시 위법성 조각은?",
      "상표권 침해에서 혼동 가능성 판단 기준 판례는?",
      "하도급법 위반 요건과 제재 수위를 정리해줘",
    ],
  },
  {
    category: "💼 계약·거래",
    questions: [
      "계약금 반환 의무 발생 요건과 배액 배상 기준은?",
      "매매계약에서 하자담보책임의 범위를 설명해줘",
      "법인과 계약 시 대표이사 권한 확인 방법은?",
      "계약 당사자가 사망한 경우 계약 효력은?",
      "전자계약서의 법적 효력과 유의사항을 알려줘",
      "프리랜서 용역계약의 근로자성 판단 기준은?",
      "영업비밀 침해 소송에서 입증 방법은?",
      "비경쟁금지 약정의 유효 범위와 한계는?",
    ],
  },
  {
    category: "🏢 기업·상사",
    questions: [
      "주주총회 결의 하자가 있을 때 취소·무효 소송 방법은?",
      "이사의 배임행위에 대한 손해배상 청구 요건은?",
      "회사 설립 시 현물출자의 법적 절차와 리스크는?",
      "소수주주권 행사 요건(대표소송, 장부열람 등)은?",
      "M&A 과정에서 진술보증 위반 시 구제 방법은?",
      "기업 분할·합병 시 채권자 보호 절차는?",
    ],
  },
  {
    category: "🏠 부동산",
    questions: [
      "전세사기 피해 시 보증금 회수 방법과 절차는?",
      "임차인이 무단전대한 경우 계약 해지 가능 여부는?",
      "근저당이 설정된 부동산 매매 시 주의사항은?",
      "건물 명도 판결 후 강제집행 절차를 설명해줘",
      "재개발 구역에서 임차인 권리 보호 방법은?",
      "가등기 설정 목적과 본등기 전환 절차는?",
    ],
  },
  {
    category: "👤 형사·형사절차",
    questions: [
      "고소장 접수 후 수사 진행 절차를 설명해줘",
      "피의자 신문 시 변호인 조력권 행사 방법은?",
      "불기소 처분에 대한 이의 방법(항고·재정신청)은?",
      "합의와 형사처벌 감경의 관계를 설명해줘",
      "사기죄 고소에서 편취 의사 입증 방법은?",
      "공소시효 기간과 정지·중단 사유를 정리해줘",
    ],
  },
  {
    category: "✍️ 서면 작성",
    questions: [
      "준비서면에 들어가야 할 핵심 법적 주장을 정리해줘",
      "사실조회 신청서 작성 방법과 대상을 알려줘",
      "가처분 신청 요건과 보전의 필요성 소명 방법은?",
      "내용증명 발송 후 효과와 후속 조치는?",
    ],
  },
  {
    category: "🗂️ 우리 케이스 조회",
    questions: [
      "업로드된 계약서에서 보증금 반환 조건이 어떻게 규정되어 있어?",
      "우리 사무소 표준 용역계약서의 위약금 규정을 정확히 알려줘",
      "저장된 NDA 계약서에서 비밀유지 의무 기간이 몇 년으로 되어 있어?",
      "지난번 저장한 판결문에서 법원이 손해배상 범위를 제한한 근거가 뭐야?",
      "피고 대리인으로 제출한 준비서면에서 소멸시효 항변 부분을 찾아줘",
      "의뢰인 건으로 작성한 법률의견서에서 우리 측 유리 쟁점 3가지가 뭐야?",
      "감정평가 보고서에서 감정인이 산정한 정상가액은 얼마야?",
      "지식베이스에 저장된 계약서 중 불가항력 조항이 포함된 문서는 어떤 것들이 있어?",
      "임금체불 사건 준비서면들에서 공통적으로 인용한 판례 패턴을 찾아줘",
      "우리 사무소 소장 작성 표준 양식에서 청구취지 작성 방법이 어떻게 안내되어 있어?",
    ],
  },
];

export default function ChatPage() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showQPanel, setShowQPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ "📋 사건 전략": true });
  const [pendingQuestion, setPendingQuestion] = useState<string>("");
  const [ragEnabled, setRagEnabled] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const json = await res.json();
        const list: Conversation[] = json.data ?? [];
        setConversations(list);
        if (list.length > 0 && !activeConvId) {
          setActiveConvId(list[0].id);
        }
      }
    } catch { /* 빈 배열 유지 */ }
    finally { setLoading(false); }
  }, [activeConvId]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    setShowSidebar(isDesktop);
  }, [isDesktop]);

  const handleNewConversation = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "새 대화" }),
      });
      if (res.ok) {
        const json = await res.json();
        const newConv: Conversation = json.data;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(newConv.id);
      }
    } catch { /* 무시 */ }
    finally { setCreating(false); }
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ [cat]: !prev[cat] }));
  };

  const handleQuestionClick = (q: string) => {
    // 대화가 없으면 새 대화 생성 후 질문 세팅
    if (!activeConvId) {
      handleNewConversation().then(() => setPendingQuestion(q));
    } else {
      setPendingQuestion(q);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const groups = groupByDate(conversations);
  const dateOrder = ["오늘", "어제", "이번 주"];
  const sortedGroups = [
    ...dateOrder.filter((d) => groups[d]),
    ...Object.keys(groups).filter((d) => !dateOrder.includes(d)),
  ];

  return (
    <div className="flex h-[calc(100svh-4rem-5rem)] md:h-[calc(100vh-4rem)] -m-4 sm:-m-6 overflow-hidden">

      {/* ── 모바일 백드롭 ── */}
      {showSidebar && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* ── 좌측: 대화 사이드바 ── */}
      <div className={clsx(
        "flex-col border-r border-slate-200 bg-white transition-all duration-200",
        showSidebar ? "w-64 flex" : "w-0 hidden md:flex md:w-64"
      )}>
        <div className="p-3 border-b border-slate-100">
          <Button fullWidth onClick={handleNewConversation} loading={creating}>
            <Plus className="w-4 h-4" />
            새 대화
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-xs">
              대화 기록이 없습니다.
            </div>
          ) : (
            sortedGroups.map((dateLabel) => (
              <div key={dateLabel} className="px-3 pb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 py-1.5">
                  {dateLabel}
                </p>
                {groups[dateLabel].map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={clsx(
                      "w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-0.5 group",
                      activeConvId === conv.id
                        ? "bg-navy-50 text-navy-900"
                        : "hover:bg-slate-50 text-slate-700"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        {conv.messages?.[0]?.content && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {conv.messages[0].content.slice(0, 40)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── 중앙: 채팅 영역 ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 rounded-md hover:bg-slate-100 transition-colors md:hidden"
            >
              <ChevronRight className={clsx("w-4 h-4 text-slate-400 transition-transform", showSidebar && "rotate-180")} />
            </button>
            <h2 className="text-sm font-semibold text-slate-900">
              {activeConv?.title ?? "AI 법률 비서"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 hidden sm:block">Claude claude-sonnet-4-6 기반</span>
            <RAGToggle enabled={ragEnabled} onChange={setRagEnabled} />
            <button
              onClick={() => setShowQPanel(!showQPanel)}
              className={clsx(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                showQPanel
                  ? "bg-navy-100 text-navy-700"
                  : "text-slate-400 hover:bg-slate-100"
              )}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              추천 질문
            </button>
          </div>
        </div>

        {activeConvId ? (
          <ChatInterface
            conversationId={activeConvId}
            pendingQuestion={pendingQuestion}
            onPendingQuestionConsumed={() => setPendingQuestion("")}
            ragEnabled={ragEnabled}
            onTitleUpdate={(title) => {
              setConversations((prev) =>
                prev.map((c) => c.id === activeConvId ? { ...c, title } : c)
              );
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
            <MessageSquare className="w-10 h-10 text-slate-200" />
            <p className="text-sm">새 대화를 시작하세요</p>
            <Button onClick={handleNewConversation} loading={creating}>
              <Plus className="w-4 h-4" />
              새 대화 시작
            </Button>
          </div>
        )}
      </div>

      {/* ── 우측: 추천 질문 패널 ── */}
      {showQPanel && (
        <div className="w-72 flex-shrink-0 flex flex-col border-l border-slate-200 bg-white hidden lg:flex">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-800">자주 쓰는 질문</span>
            <span className="ml-auto text-xs text-slate-400">60개</span>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
            {QUICK_QUESTIONS.map((group) => {
              const isRAG = group.category === "🗂️ 우리 케이스 조회";
              return (
                <div key={group.category} className={clsx("mb-1", isRAG && "border-t border-slate-200 mt-1 pt-1")}>
                  {/* 카테고리 헤더 */}
                  <button
                    onClick={() => toggleCategory(group.category)}
                    className={clsx(
                      "w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left",
                      isRAG ? "hover:bg-navy-50" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={clsx("text-sm font-medium", isRAG ? "text-navy-700" : "text-slate-700")}>
                        {group.category}
                      </span>
                      {isRAG && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-navy-100 text-navy-600 font-semibold">
                          RAG
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">{group.questions.length}</span>
                      <ChevronDown className={clsx(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        isRAG ? "text-navy-400" : "text-slate-400",
                        openCategories[group.category] && "rotate-180"
                      )} />
                    </div>
                  </button>

                  {/* 질문 목록 */}
                  {openCategories[group.category] && (
                    <div className="pb-1">
                      {group.questions.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQuestionClick(q)}
                          className={clsx(
                            "w-full text-left px-4 py-2 text-xs transition-colors leading-relaxed border-l-2",
                            isRAG
                              ? "text-navy-700 hover:bg-navy-50 border-transparent hover:border-navy-500"
                              : "text-slate-600 hover:bg-navy-50 hover:text-navy-800 border-transparent hover:border-navy-400"
                          )}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 text-center">
            질문을 클릭하면 채팅창에 입력됩니다
          </div>
        </div>
      )}
    </div>
  );
}
