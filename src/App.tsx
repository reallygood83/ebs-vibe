import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  Bell,
  Bookmark,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Pin,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useClassroom, getYoutubeId, type Notice, type Lesson } from "./store";
import "./styles.css";

type Page =
  "대시보드" | "공지 모아보기" | "영상 수업" | "일정 캘린더" | "저장한 항목";
type ModalState =
  | { kind: "notice"; item?: Notice }
  | { kind: "lesson"; item?: Lesson }
  | { kind: "noticeDetail"; item: Notice }
  | { kind: "lessonDetail"; item: Lesson }
  | null;
const categories = ["전체", "학교", "학급", "수행평가"] as const;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysLeft = (date: string) =>
  date
    ? Math.ceil(
        (new Date(`${date}T00:00:00`).getTime() -
          new Date(`${today()}T00:00:00`).getTime()) /
          86400000,
      )
    : null;
const deadline = (date: string) => {
  const d = daysLeft(date);
  return d === null
    ? "기한 없음"
    : d === 0
      ? "오늘 마감"
      : d < 0
        ? `기한 ${-d}일 지남`
        : `D-${d}`;
};
const shortDate = (date: string) =>
  date
    ? new Date(`${date}T12:00:00`).toLocaleDateString("ko-KR", {
        month: "long",
        day: "numeric",
      })
    : "상시";

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll<HTMLElement>(
          "button, input, textarea, select, [href]",
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">MOA CLASS</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="닫기">
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const store = useClassroom();
  const [page, setPage] = useState<Page>("대시보드");
  const [category, setCategory] = useState<(typeof categories)[number]>("전체");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sidebar, setSidebar] = useState(false);
  const [sort, setSort] = useState<"latest" | "due">("latest");
  const [month, setMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const sharedId = new URLSearchParams(location.search).get("lesson");
  const canWrite = store.mode === "demo" || Boolean(store.user);
  const demo = store.mode === "demo" || !store.user;
  const run = async (action: () => Promise<void>, success?: string) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
      if (success) setMessage(success);
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "처리하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  const navigate = (p: Page) => {
    setPage(p);
    setSidebar(false);
    setSearch("");
  };
  const notices = store.notices
    .filter(
      (n) =>
        (category === "전체" || n.category === category) &&
        (page !== "저장한 항목" || store.bookmarks.includes(n.id)) &&
        `${n.title} ${n.body} ${n.subject}`
          .toLocaleLowerCase()
          .includes(search.toLocaleLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        (sort === "due"
          ? (a.dueDate || "9999").localeCompare(b.dueDate || "9999")
          : b.createdAt - a.createdAt),
    );
  const lessons = store.lessons.filter(
    (l) =>
      (page !== "저장한 항목" || store.bookmarks.includes(l.id)) &&
      `${l.title} ${l.description} ${l.subject}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const pending = store.notices.filter((n) => !n.done);
  const urgent = pending.filter((n) => {
    const d = daysLeft(n.dueDate);
    return d !== null && d >= 0 && d <= 7;
  });
  const close = () => setModal(null);
  const saveNotice = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const item = modal?.kind === "notice" ? modal.item : undefined;
    void run(async () => {
      await store.saveNotice(
        {
          title: String(fd.get("title")).trim(),
          body: String(fd.get("body")).trim(),
          category: String(fd.get("category")) as Notice["category"],
          subject: String(fd.get("subject")).trim(),
          dueDate: String(fd.get("dueDate")),
          pinned: fd.get("pinned") === "on",
          done: item?.done ?? false,
        },
        item?.id,
      );
      close();
    }, "공지사항을 저장했습니다.");
  };
  const saveLesson = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const youtubeId = getYoutubeId(String(fd.get("url")));
    if (!youtubeId) {
      setMessage("올바른 YouTube 영상 주소를 입력해 주세요.");
      return;
    }
    const item = modal?.kind === "lesson" ? modal.item : undefined;
    void run(async () => {
      await store.saveLesson(
        {
          title: String(fd.get("title")).trim(),
          description: String(fd.get("description")).trim(),
          subject: String(fd.get("subject")).trim(),
          youtubeId,
          shared: fd.get("shared") === "on",
        },
        item?.id,
      );
      close();
    }, "영상 수업을 저장했습니다.");
  };
  const markDone = (n: Notice) =>
    run(
      () => store.saveNotice({ ...n, done: !n.done }, n.id),
      n.done ? "다시 할 일로 표시했습니다." : "확인 완료로 표시했습니다.",
    );
  const share = (l: Lesson) =>
    run(async () => {
      if (store.mode === "demo")
        throw new Error(
          "체험 수업은 공유할 수 없습니다. Google 로그인 후 수업을 등록해 주세요.",
        );
      if (!l.shared) throw new Error("수업 수정에서 링크 공유를 켜 주세요.");
      await navigator.clipboard.writeText(`${location.origin}/?lesson=${l.id}`);
    }, "학생 공유 링크를 복사했습니다.");
  const lessonDetail = (lesson: Lesson) => (
    <>
      <div className="video-embed">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeId}`}
          title={lesson.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="detail-meta">
        <span className="pill teal">{lesson.subject || "수업 자료"}</span>
        <span>{lesson.shared ? "링크로 공유하는 수업" : "나만 보는 수업"}</span>
      </div>
      <p className="detail-body">{lesson.description}</p>
      <a
        className="text-button"
        href={`https://www.youtube.com/watch?v=${lesson.youtubeId}`}
        target="_blank"
        rel="noreferrer"
      >
        YouTube에서 영상 열기 ↗
      </a>
      {!sharedId && (
        <div className="detail-actions">
          <button
            className="secondary-button"
            onClick={() => void share(lesson)}
            disabled={busy}
          >
            <Share2 size={15} />
            학생에게 공유
          </button>
          <button
            className="text-button"
            onClick={() => setModal({ kind: "lesson", item: lesson })}
          >
            수정하기
          </button>
          <button
            className="icon-button danger"
            aria-label="수업 삭제"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await store.deleteLesson(lesson.id);
                close();
              }, "수업을 삭제했습니다.")
            }
          >
            <Trash2 size={17} />
          </button>
        </div>
      )}
      <div className="comments">
        <h3>
          <MessageCircle size={18} /> 함께 생각 나누기{" "}
          <span>
            {store.comments.filter((c) => c.lessonId === lesson.id).length}
          </span>
        </h3>
        {store.comments
          .filter((c) => c.lessonId === lesson.id)
          .map((c) => (
            <article className="comment" key={c.id}>
              <div className="comment-avatar">{c.alias.slice(0, 1)}</div>
              <div>
                <strong>{c.alias}</strong>
                <time>{new Date(c.createdAt).toLocaleDateString("ko-KR")}</time>
                <p>{c.text}</p>
              </div>
            </article>
          ))}
        {!store.comments.some((c) => c.lessonId === lesson.id) && (
          <p className="muted">
            영상에서 발견한 점이나 궁금한 점을 첫 댓글로 남겨 보세요.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            void run(async () => {
              await store.addComment(
                lesson.id,
                String(fd.get("text")).trim(),
                String(fd.get("alias")).trim(),
              );
              form.reset();
            }, "댓글을 등록했습니다.");
          }}
          className="comment-form"
        >
          <label>
            별명
            <input
              name="alias"
              maxLength={20}
              placeholder="예: 푸른하늘"
              required
              disabled={!canWrite}
            />
          </label>
          <label>
            내 생각
            <textarea
              name="text"
              maxLength={2000}
              placeholder="영상을 보고 어떤 생각이 들었나요?"
              required
              rows={3}
              disabled={!canWrite}
            />
          </label>
          <div>
            <small>이름·번호·연락처 등 개인정보는 쓰지 말아 주세요.</small>
            <button className="primary-button" disabled={busy || !canWrite}>
              {busy ? "등록 중…" : "댓글 남기기"}
            </button>
          </div>
          {!canWrite && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => void run(store.login)}
            >
              Google 로그인하고 참여하기
            </button>
          )}
        </form>
      </div>
    </>
  );
  const noticeRows = (items: Notice[]) =>
    items.length ? (
      <div className="notice-list">
        {items.map((n) => (
          <article
            key={n.id}
            className={`notice-row ${n.done ? "completed" : ""}`}
          >
            <button
              className={`check-button ${n.done ? "checked" : ""}`}
              onClick={() => void markDone(n)}
              disabled={busy || !canWrite}
              aria-label={`${n.title} ${n.done ? "미완료" : "완료"} 표시`}
            >
              {n.done && <Check size={13} />}
            </button>
            <button
              className="notice-content"
              onClick={() => setModal({ kind: "noticeDetail", item: n })}
            >
              <div className="notice-topline">
                <span
                  className={`category-label ${n.category === "학교" ? "school" : n.category === "학급" ? "class" : "assessment"}`}
                >
                  {n.category} 공지
                </span>
                {n.pinned && <Pin size={12} className="pin" />}
                {n.subject && (
                  <span className="notice-subject">{n.subject}</span>
                )}
              </div>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
            </button>
            <div className="notice-right">
              <span
                className={`deadline ${daysLeft(n.dueDate) !== null && daysLeft(n.dueDate)! <= 3 && !n.done ? "urgent" : ""}`}
              >
                {n.done ? "확인 완료" : deadline(n.dueDate)}
              </span>
              <small>{shortDate(n.dueDate)}</small>
            </div>
            <button
              className={`icon-button bookmark-button ${store.bookmarks.includes(n.id) ? "saved" : ""}`}
              disabled={busy || !canWrite}
              aria-label={`${n.title} 저장`}
              onClick={() => void run(() => store.toggleBookmark(n.id))}
            >
              <Bookmark
                size={17}
                fill={store.bookmarks.includes(n.id) ? "currentColor" : "none"}
              />
            </button>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty">
        <FolderOpen size={36} />
        <h3>{search ? "검색 결과가 없어요" : "아직 등록된 공지가 없어요"}</h3>
        <p>
          {search
            ? "다른 단어나 분류로 찾아보세요."
            : "새 공지를 등록하면 이곳에서 한눈에 볼 수 있어요."}
        </p>
      </div>
    );
  const lessonCards = (items: Lesson[]) =>
    items.length ? (
      <div className="lesson-grid">
        {items.map((l, i) => (
          <article className="lesson-card" key={l.id}>
            <button
              className={`lesson-cover cover-${i % 3}`}
              onClick={() => setModal({ kind: "lessonDetail", item: l })}
            >
              <img
                className="lesson-thumbnail"
                src={`https://i.ytimg.com/vi/${l.youtubeId}/hqdefault.jpg`}
                alt={`${l.title} YouTube 썸네일`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                onLoad={(e) => { e.currentTarget.style.visibility = "visible"; }}
              />
              <div className="cover-grid" />
              <span className="cover-subject">
                {l.subject || "함께 배우는 시간"}
              </span>
              <span className="cover-title">{l.title}</span>
              <span className="play-circle">
                <Video size={23} />
              </span>
              <span className="youtube-label">YouTube 수업</span>
            </button>
            <div className="lesson-card-body">
              <span className="pill teal">{l.subject || "수업"}</span>
              <button
                className="icon-button"
                disabled={busy || !canWrite}
                onClick={() => void run(() => store.toggleBookmark(l.id))}
                aria-label={`${l.title} 저장`}
              >
                <Bookmark
                  size={16}
                  fill={
                    store.bookmarks.includes(l.id) ? "currentColor" : "none"
                  }
                />
              </button>
              <button
                className="lesson-title"
                onClick={() => setModal({ kind: "lessonDetail", item: l })}
              >
                {l.title}
              </button>
              <p>{l.description}</p>
              <footer>
                <span>
                  <MessageCircle size={13} />
                  {store.comments.filter((c) => c.lessonId === l.id).length}개의
                  생각
                </span>
                <span>{l.shared ? "공유 수업" : "나만 보기"}</span>
              </footer>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <div className="empty">
        <Video size={36} />
        <h3>첫 영상 수업을 만들어 보세요</h3>
        <p>YouTube 주소와 질문을 붙이면 수업 준비가 끝나요.</p>
      </div>
    );
  const calendar = () => {
    const offset = month.getDay();
    const count = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
    ).getDate();
    return (
      <section className="panel calendar-panel">
        <div className="section-heading">
          <h2>
            {month.getFullYear()}년 {month.getMonth() + 1}월
          </h2>
          <div className="calendar-controls">
            <button
              className="icon-button"
              aria-label="이전 달"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              <ChevronLeft size={19} />
            </button>
            <button
              className="text-button"
              onClick={() =>
                setMonth(
                  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                )
              }
            >
              오늘
            </button>
            <button
              className="icon-button"
              aria-label="다음 달"
              onClick={() =>
                setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div className="weekday" key={d}>
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div className="calendar-cell blank" key={`b${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
            return (
              <div
                className={`calendar-cell ${date === today() ? "is-today" : ""}`}
                key={date}
              >
                <span className="day-number">{i + 1}</span>
                {store.notices
                  .filter((n) => n.dueDate === date)
                  .map((n) => (
                    <button
                      className={`calendar-event ${n.done ? "event-done" : ""}`}
                      key={n.id}
                      onClick={() =>
                        setModal({ kind: "noticeDetail", item: n })
                      }
                    >
                      {n.title}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      </section>
    );
  };
  if (sharedId) {
    const lesson = store.lessons.find((l) => l.id === sharedId);
    return (
      <div className="student-page">
        <header className="student-header">
          <a className="brand" href="/">
            <span className="brand-icon">
              <BookOpen size={23} />
            </span>
            모아클래스
            <span className="brand-dot" />
          </a>
          <span className="pill teal">함께 배우는 교실</span>
          {store.user ? (
            <button
              className="text-button"
              onClick={() => void run(store.logout)}
            >
              로그아웃
            </button>
          ) : (
            <button
              className="secondary-button"
              onClick={() => void run(store.login)}
              disabled={busy}
            >
              Google 로그인
            </button>
          )}
        </header>
        {(message || store.error) && (
          <div className="toast" role="status">
            {message || store.error}
          </div>
        )}
        <main className="student-main">
          {!store.ready ? (
            <div className="empty">수업을 불러오는 중이에요…</div>
          ) : lesson ? (
            <>
              <span className="eyebrow">OUR CLASSROOM</span>
              <h1>{lesson.title}</h1>
              {lessonDetail(lesson)}
            </>
          ) : (
            <div className="empty">
              <BookOpen size={40} />
              <h2>공유된 수업을 찾을 수 없어요</h2>
              <p>링크가 정확한지 또는 수업 공유가 켜져 있는지 확인해 주세요.</p>
              <a href="/">모아클래스로 가기</a>
            </div>
          )}
        </main>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <button
        className="mobile-menu icon-button"
        aria-label="메뉴 열기"
        onClick={() => setSidebar(!sidebar)}
      >
        <Menu size={22} />
      </button>
      {sidebar && (
        <button
          className="sidebar-shade"
          aria-label="메뉴 닫기"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <a href="/" className="brand">
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          모아클래스
          <span className="brand-dot" />
        </a>
        <div className="workspace">
          <span className="workspace-avatar">
            <GraduationCap size={21} />
          </span>
          <div>
            <strong>나의 교무실</strong>
            <span>선생님의 하루를 가볍게</span>
          </div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {(
            [
              { name: "대시보드", icon: LayoutDashboard },
              { name: "공지 모아보기", icon: Bell },
              { name: "영상 수업", icon: Video },
              { name: "일정 캘린더", icon: CalendarDays },
              { name: "저장한 항목", icon: Bookmark },
            ] as const
          ).map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "공지 모아보기" && <b>{store.notices.length}</b>}
              {name === "저장한 항목" && store.bookmarks.length > 0 && (
                <b>{store.bookmarks.length}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-spark">
            <Sparkles size={20} />
          </span>
          <strong>
            흩어진 학교생활을,
            <br />
            한곳에 차곡차곡.
          </strong>
          <p>
            공지부터 수업의 작은 생각까지
            <br />
            모아클래스와 함께해요.
          </p>
          <span className="note-decoration">✳</span>
        </div>
        <div className="sidebar-bottom">
          <div className="account-avatar">
            {store.user?.displayName?.slice(0, 1) || "T"}
          </div>
          <div>
            <strong>{store.user?.displayName || "선생님, 안녕하세요"}</strong>
            <span>
              {store.user
                ? "Google 계정 연결됨"
                : "로그인하고 내 자료 저장하기"}
            </span>
          </div>
          {store.user ? (
            <button
              aria-label="로그아웃"
              className="icon-button"
              onClick={() => void run(store.logout)}
            >
              <LogOut size={17} />
            </button>
          ) : (
            <button
              className="login-small"
              onClick={() => void run(store.login)}
              disabled={busy}
            >
              로그인
            </button>
          )}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            나의 교무실 <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-date">
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </span>
            <span className="top-divider" />
            <button
              className="account-circle"
              onClick={() =>
                store.user
                  ? setMessage(
                      "Google 계정으로 연결되어 있습니다. 로그아웃은 왼쪽 아래에서 할 수 있어요.",
                    )
                  : void run(store.login)
              }
              aria-label="내 계정"
            >
              <GraduationCap size={20} />
            </button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR DAY, ALL TOGETHER</div>
              <h1>{page === "대시보드" ? "오늘도, 가벼운 학교생활" : page}</h1>
              <p>
                {page === "대시보드"
                  ? "놓치기 쉬운 공지와 수업 준비, 이제 한곳에서 시작하세요."
                  : page === "영상 수업"
                    ? "좋은 영상에 생각을 더해, 우리 반의 수업으로."
                    : page === "일정 캘린더"
                      ? "다가오는 마감일을 미리 확인하고 여유롭게 준비하세요."
                      : page === "저장한 항목"
                        ? "다시 보고 싶은 공지와 수업을 차곡차곡 모았어요."
                        : "학교 · 학급 · 수행평가 공지를 빠르게 기록하고 찾아보세요."}
              </p>
            </div>
            <button
              className="primary-button add-button"
              onClick={() => {
                if (!canWrite) {
                  void run(store.login);
                  return;
                }
                setModal({ kind: page === "영상 수업" ? "lesson" : "notice" });
              }}
              disabled={busy}
            >
              <Plus size={18} />
              {page === "영상 수업" ? "영상 수업 만들기" : "새 공지 등록"}
            </button>
          </div>
          {demo && (
            <div className="demo-banner">
              <span>
                <span className="status-dot" />
                {store.mode === "demo" ? "체험 모드" : "미리보기"}
                <span className="demo-copy">
                  예시 자료입니다.{" "}
                  {store.mode === "demo"
                    ? "변경 내용은 이 브라우저에만 저장됩니다."
                    : "Google 로그인으로 나만의 공지함을 시작하세요."}
                </span>
              </span>
              <button
                onClick={() =>
                  store.mode === "demo"
                    ? void run(store.login)
                    : store.switchToDemo()
                }
              >
                {store.mode === "demo" ? "Google로 시작하기" : "직접 체험하기"}
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          {(message || store.error) && (
            <div className="feedback" role="status">
              <span>{message || store.error}</span>
              {message && (
                <button
                  className="icon-button"
                  aria-label="알림 닫기"
                  onClick={() => setMessage("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          {page === "대시보드" && (
            <>
              <section className="hero">
                <div className="hero-content">
                  <span className="hero-kicker">
                    <span />
                    선생님을 위한 작은 정리 습관
                  </span>
                  <h2>
                    기억은 모아클래스에,
                    <br />
                    마음은 아이들에게.
                  </h2>
                  <p>
                    쏟아지는 공지, 흩어진 수업 자료.
                    <br />
                    차곡차곡 모아두면 선생님의 하루가 달라져요.
                  </p>
                  <button
                    onClick={() => {
                      navigate("공지 모아보기");
                    }}
                    className="hero-link"
                  >
                    나의 공지함 살펴보기
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <span className="art-star star-one">✳</span>
                  <span className="art-star star-two">✦</span>
                  <div className="art-shadow" />
                  <div className="art-folder">
                    <div className="folder-tab" />
                    <div className="art-sheet sheet-back" />
                    <div className="art-sheet sheet-front">
                      <span className="sheet-heading" />
                      <i />
                      <i />
                      <i />
                      <span className="sheet-check">
                        <Check size={24} />
                      </span>
                    </div>
                    <div className="folder-front">
                      <BookOpen size={34} />
                      <span>my classroom</span>
                    </div>
                  </div>
                  <div className="art-bubble">
                    <CheckCheck size={17} />
                    <span>하나씩, 놓치지 않도록</span>
                  </div>
                  <div className="art-tiny-note">
                    <Pin size={16} />
                    <span>오늘의 작은 기록</span>
                  </div>
                </div>
              </section>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-icon green">
                    <Bell size={21} />
                  </span>
                  <div>
                    <span>모아둔 공지</span>
                    <strong>
                      {store.notices.length}
                      <small>개</small>
                    </strong>
                  </div>
                  <span className="stat-note">한곳에 차곡차곡</span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon orange">
                    <Clock3 size={21} />
                  </span>
                  <div>
                    <span>7일 안에 마감</span>
                    <strong>
                      {urgent.length}
                      <small>개</small>
                    </strong>
                  </div>
                  <span className="stat-note orange-text">
                    미리 챙겨 보세요
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-icon purple">
                    <Video size={21} />
                  </span>
                  <div>
                    <span>준비된 영상 수업</span>
                    <strong>
                      {store.lessons.length}
                      <small>개</small>
                    </strong>
                  </div>
                  <span className="stat-note">생각이 자라는 시간</span>
                </div>
              </div>
            </>
          )}
          {(page === "대시보드" ||
            page === "공지 모아보기" ||
            page === "저장한 항목") && (
            <section className="panel notices-panel">
              <div className="section-heading">
                <div className="heading-with-count">
                  <h2>
                    {page === "대시보드"
                      ? "놓치지 말아야 할 공지"
                      : page === "저장한 항목"
                        ? "저장한 공지"
                        : "나의 공지함"}
                  </h2>
                  <span>{notices.length}</span>
                </div>
                {page === "대시보드" ? (
                  <button
                    className="text-button"
                    onClick={() => navigate("공지 모아보기")}
                  >
                    전체 보기
                    <ChevronRight size={15} />
                  </button>
                ) : (
                  <label className="sort-select">
                    <ArrowDown size={14} />
                    <select
                      value={sort}
                      onChange={(e) =>
                        setSort(e.target.value as "latest" | "due")
                      }
                      aria-label="공지 정렬"
                    >
                      <option value="latest">최근 등록순</option>
                      <option value="due">마감일순</option>
                    </select>
                  </label>
                )}
              </div>
              <div className="notice-toolbar">
                <div className="filter-tabs">
                  {categories.map((c) => (
                    <button
                      className={category === c ? "selected" : ""}
                      key={c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                      {c === "전체" && <span>{store.notices.length}</span>}
                    </button>
                  ))}
                </div>
                <label className="search-box">
                  <Search size={16} />
                  <input
                    placeholder="공지 제목, 내용 검색"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="공지 검색"
                  />
                  {search && (
                    <button
                      className="icon-button"
                      aria-label="검색 지우기"
                      onClick={() => setSearch("")}
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
              </div>
              {noticeRows(page === "대시보드" ? notices.slice(0, 4) : notices)}
              {page === "대시보드" && notices.length > 4 && (
                <button
                  className="panel-bottom-link"
                  onClick={() => navigate("공지 모아보기")}
                >
                  모든 공지 확인하기 <ArrowRight size={14} />
                </button>
              )}
            </section>
          )}
          {(page === "대시보드" ||
            page === "영상 수업" ||
            page === "저장한 항목") && (
            <section className="lessons-section">
              <div className="section-heading">
                <div>
                  <div className="heading-with-count">
                    <h2>
                      {page === "저장한 항목"
                        ? "저장한 영상 수업"
                        : "우리 반, 영상으로 여는 수업"}
                    </h2>
                    <span>{lessons.length}</span>
                  </div>
                  <p>함께 보고, 질문하고, 생각을 나누는 공간</p>
                </div>
                {page === "대시보드" ? (
                  <button
                    className="text-button"
                    onClick={() => navigate("영상 수업")}
                  >
                    전체 보기
                    <ChevronRight size={15} />
                  </button>
                ) : page === "영상 수업" ? (
                  <label className="search-box">
                    <Search size={16} />
                    <input
                      placeholder="수업 제목, 주제 검색"
                      aria-label="수업 검색"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                ) : null}
              </div>
              {lessonCards(page === "대시보드" ? lessons.slice(0, 3) : lessons)}
            </section>
          )}
          {page === "일정 캘린더" && calendar()}
          <footer className="page-footer">
            <span className="footer-mark">
              <BookOpen size={14} />
              모아클래스
            </span>
            <span>선생님의 일상에, 조금 더 여유를.</span>
          </footer>
        </main>
      </div>
      {modal && (
        <Modal
          title={
            modal.kind === "notice"
              ? modal.item
                ? "공지 수정하기"
                : "새 공지 등록"
              : modal.kind === "lesson"
                ? modal.item
                  ? "영상 수업 수정"
                  : "영상 수업 만들기"
                : modal.item.title
          }
          onClose={close}
        >
          {message && (
            <div className="feedback" role="status">
              {message}
            </div>
          )}
          {modal.kind === "notice" ? (
            <form className="editor-form" onSubmit={saveNotice}>
              <div className="form-row">
                <label>
                  공지 분류
                  <select
                    name="category"
                    defaultValue={modal.item?.category || "학교"}
                  >
                    {categories
                      .filter((c) => c !== "전체")
                      .map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                  </select>
                </label>
                <label>
                  관련 과목 · 학급
                  <input
                    name="subject"
                    placeholder="예: 2학년 3반 / 과학"
                    defaultValue={modal.item?.subject}
                    maxLength={50}
                  />
                </label>
              </div>
              <label>
                공지 제목
                <input
                  name="title"
                  placeholder="어떤 공지를 기억해 둘까요?"
                  defaultValue={modal.item?.title}
                  required
                  maxLength={150}
                />
              </label>
              <label>
                공지 내용
                <textarea
                  name="body"
                  placeholder="받은 공지를 붙여 넣거나, 필요한 내용을 기록하세요."
                  defaultValue={modal.item?.body}
                  rows={7}
                  required
                  maxLength={10000}
                />
              </label>
              <div className="form-row">
                <label>
                  마감일
                  <input
                    type="date"
                    name="dueDate"
                    defaultValue={modal.item?.dueDate}
                  />
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="pinned"
                    defaultChecked={modal.item?.pinned}
                  />
                  <Pin size={15} />
                  중요 공지로 고정
                </label>
              </div>
              <div className="form-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={close}
                >
                  취소
                </button>
                <button className="primary-button" disabled={busy}>
                  {busy ? "저장 중…" : "공지 저장하기"}
                </button>
              </div>
            </form>
          ) : modal.kind === "lesson" ? (
            <form className="editor-form" onSubmit={saveLesson}>
              <label>
                수업 제목
                <input
                  name="title"
                  placeholder="예: 우리 주변의 기후 변화"
                  defaultValue={modal.item?.title}
                  required
                  maxLength={150}
                />
              </label>
              <label>
                과목 · 주제
                <input
                  name="subject"
                  placeholder="예: 과학 · 환경"
                  defaultValue={modal.item?.subject}
                  maxLength={50}
                />
              </label>
              <label>
                YouTube 영상 주소
                <input
                  type="url"
                  name="url"
                  placeholder="https://www.youtube.com/watch?v=…"
                  defaultValue={
                    modal.item
                      ? `https://www.youtube.com/watch?v=${modal.item.youtubeId}`
                      : ""
                  }
                  required
                />
                <small>영상이 수업 페이지에 바로 임베드됩니다.</small>
              </label>
              <label>
                수업 안내 · 함께 생각할 질문
                <textarea
                  name="description"
                  placeholder="영상을 보고 어떤 이야기를 나누고 싶나요?"
                  defaultValue={modal.item?.description}
                  required
                  rows={5}
                  maxLength={10000}
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="shared"
                  defaultChecked={modal.item?.shared}
                />
                <Share2 size={15} />
                링크를 아는 학생에게 수업 공유
                <small>공유 수업은 링크를 가진 누구나 볼 수 있습니다.</small>
              </label>
              <div className="form-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={close}
                >
                  취소
                </button>
                <button className="primary-button" disabled={busy}>
                  {busy ? "저장 중…" : "영상 수업 저장"}
                </button>
              </div>
            </form>
          ) : modal.kind === "noticeDetail" ? (
            <div className="notice-detail">
              <div className="detail-meta">
                <span className="pill teal">{modal.item.category} 공지</span>
                <span>{modal.item.subject}</span>
                <span>
                  {deadline(modal.item.dueDate)} ·{" "}
                  {shortDate(modal.item.dueDate)}
                </span>
              </div>
              <p className="detail-body">{modal.item.body}</p>
              <div className="detail-actions">
                <button
                  className="primary-button"
                  onClick={() =>
                    void run(async () => {
                      await store.saveNotice(
                        { ...modal.item, done: !modal.item.done },
                        modal.item.id,
                      );
                      close();
                    })
                  }
                  disabled={busy || !canWrite}
                >
                  <Check size={16} />
                  {modal.item.done ? "다시 할 일로" : "확인 완료"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setModal({ kind: "notice", item: modal.item })}
                  disabled={!canWrite}
                >
                  수정
                </button>
                <button
                  className="icon-button danger"
                  aria-label="공지 삭제"
                  disabled={busy || !canWrite}
                  onClick={() =>
                    void run(async () => {
                      await store.deleteNotice(modal.item.id);
                      close();
                    }, "공지를 삭제했습니다.")
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          ) : (
            <div className="lesson-detail">{lessonDetail(modal.item)}</div>
          )}
        </Modal>
      )}
      {busy && (
        <div className="loading-indicator" role="status">
          처리 중…
        </div>
      )}
    </div>
  );
}
