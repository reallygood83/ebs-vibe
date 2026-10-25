import type { Notice, Lesson, Comment } from "./model";
const date = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const base = { ownerId: "demo", createdAt: Date.now(), done: false };
export const sampleNotices: Notice[] = [
  {
    ...base,
    id: "n1",
    title: "2학기 학부모 상담 주간 안내",
    body: "학부모 상담 주간을 운영합니다. 상담 가능한 시간을 확인하고 학급 안내문을 준비해 주세요.\n\n이 공지는 기능 체험을 위한 예시 자료입니다.",
    category: "학교",
    subject: "교무부",
    dueDate: date(2),
    pinned: true,
  },
  {
    ...base,
    id: "n2",
    title: "국어 수행평가 · 나의 생각을 담은 글쓰기",
    body: "우리 주변의 문제를 하나 고르고 자신의 생각과 근거를 담은 글을 씁니다.\n준비물: 글쓰기 활동지, 필기도구\n평가 기준: 주장과 근거의 연결, 글의 구성, 표현의 정확성\n\n기능 체험을 위한 예시입니다.",
    category: "수행평가",
    subject: "국어",
    dueDate: date(1),
    pinned: true,
  },
  {
    ...base,
    id: "n3",
    title: "우리 반 현장체험학습 준비물",
    body: "물, 편한 신발, 개인 돗자리를 준비해 주세요. 출발 전 교실에서 안전 수칙을 함께 확인합니다.\n예시 공지입니다.",
    category: "학급",
    subject: "우리 반",
    dueDate: date(4),
    pinned: false,
  },
  {
    ...base,
    id: "n4",
    title: "교직원 연수 자료 확인 안내",
    body: "연수 자료를 확인하고 필요한 내용을 기록해 주세요.\n예시 공지입니다.",
    category: "학교",
    subject: "연구부",
    dueDate: date(6),
    pinned: false,
  },
  {
    ...base,
    id: "n5",
    title: "과학 탐구 보고서 제출",
    body: "관찰한 내용과 궁금한 점을 탐구 보고서에 정리합니다.\n예시 수행평가입니다.",
    category: "수행평가",
    subject: "과학",
    dueDate: date(7),
    pinned: false,
  },
  {
    ...base,
    id: "n6",
    title: "학급 독서 모임 안내",
    body: "함께 읽은 책에서 기억에 남는 문장을 골라 소개해 봅시다.\n예시 공지입니다.",
    category: "학급",
    subject: "독서",
    dueDate: "",
    pinned: false,
  },
];
export const sampleLessons: Lesson[] = [
  {
    id: "l1",
    ownerId: "demo",
    createdAt: Date.now(),
    title: "우리가 사는 지구, 함께 지키는 방법",
    subject: "과학",
    description:
      "영상 예시입니다. 영상을 보고 새롭게 알게 된 사실과 우리가 실천할 수 있는 일을 댓글로 남겨 봅시다.",
    youtubeId: "G4H1N_yXBiA",
    shared: false,
  },
  {
    id: "l2",
    ownerId: "demo",
    createdAt: Date.now(),
    title: "작은 질문에서 시작하는 우주 탐험",
    subject: "과학",
    description:
      "영상 예시입니다. 가장 궁금했던 장면은 무엇인가요? 질문을 하나씩 남겨 봅시다.",
    youtubeId: "libKVRa01L8",
    shared: false,
  },
];
export const sampleComments: Comment[] = [];
