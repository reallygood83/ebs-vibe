export interface Notice {
  id: string;
  title: string;
  body: string;
  category: "학교" | "학급" | "수행평가";
  subject: string;
  dueDate: string;
  pinned: boolean;
  done: boolean;
  createdAt: number;
  ownerId: string;
}
export interface Lesson {
  id: string;
  title: string;
  description: string;
  subject: string;
  youtubeId: string;
  createdAt: number;
  ownerId: string;
  shared: boolean;
}
export interface Comment {
  id: string;
  lessonId: string;
  text: string;
  alias: string;
  ownerId: string;
  createdAt: number;
}
export function getYoutubeId(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1);
    if (
      ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)
    )
      id =
        u.pathname === "/watch"
          ? u.searchParams.get("v")
          : (u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)$/)?.[1] ??
            null);
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function validateNotice(
  n: Omit<Notice, "id" | "ownerId" | "createdAt">,
) {
  if (
    !n.title.trim() ||
    n.title.length > 160 ||
    n.body.length > 20000 ||
    !["학교", "학급", "수행평가"].includes(n.category) ||
    n.subject.length > 80
  )
    throw new Error(
      "제목과 분류를 확인해 주세요. 제목은 160자까지 입력할 수 있습니다.",
    );
  if (n.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(n.dueDate))
    throw new Error("마감 날짜를 확인해 주세요.");
}
export function validateLesson(
  n: Omit<Lesson, "id" | "ownerId" | "createdAt">,
) {
  if (
    !n.title.trim() ||
    n.title.length > 160 ||
    n.description.length > 20000 ||
    n.subject.length > 80 ||
    !/^[-\w]{11}$/.test(n.youtubeId)
  )
    throw new Error("제목과 올바른 YouTube 영상 주소를 입력해 주세요.");
}

export function noticeFields(n: Omit<Notice, "id" | "ownerId" | "createdAt">) {
  return {
    title: n.title.trim(),
    body: n.body,
    category: n.category,
    subject: n.subject,
    dueDate: n.dueDate,
    pinned: n.pinned,
    done: n.done,
  };
}
export function lessonFields(n: Omit<Lesson, "id" | "ownerId" | "createdAt">) {
  return {
    title: n.title.trim(),
    description: n.description,
    subject: n.subject,
    youtubeId: n.youtubeId,
    shared: n.shared,
  };
}
