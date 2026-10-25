import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  where,
  addDoc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import type { Notice, Lesson, Comment } from "./model";
import {
  validateNotice,
  validateLesson,
  noticeFields,
  lessonFields,
} from "./model";
import { sampleNotices, sampleLessons, sampleComments } from "./sample";
export type { Notice, Lesson, Comment } from "./model";
export { getYoutubeId } from "./model";
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = config.apiKey ? initializeApp(config) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const KEY = "moa-classroom-demo-v1";
type Demo = {
  notices: Notice[];
  lessons: Lesson[];
  comments: Comment[];
  bookmarks: string[];
};
function readDemo(): Demo {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      d &&
      Array.isArray(d.notices) &&
      Array.isArray(d.lessons) &&
      Array.isArray(d.comments) &&
      Array.isArray(d.bookmarks)
    )
      return d;
  } catch {
    /* use examples */
  }
  return {
    notices: sampleNotices,
    lessons: sampleLessons,
    comments: sampleComments,
    bookmarks: [],
  };
}
export function useClassroom() {
  const [sharedId, setSharedId] = useState(() =>
    new URLSearchParams(window.location.search).get("lesson"),
  );
  const [user, setUser] = useState<User | null>(null),
    [mode, setMode] = useState<"demo" | "cloud">("cloud"),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [demo, setDemo] = useState<Demo>(readDemo),
    [notices, setNotices] = useState<Notice[]>([]),
    [lessons, setLessons] = useState<Lesson[]>([]),
    [comments, setComments] = useState<Comment[]>([]),
    [bookmarks, setBookmarks] = useState<string[]>([]);
  useEffect(() => {
    if (!auth) {
      setReady(true);
      setError(
        "Firebase 설정을 찾을 수 없습니다. 체험 모드로 기능을 확인할 수 있습니다.",
      );
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
      setError("");
    });
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(demo));
    } catch {
      setError(
        "브라우저 저장 공간을 사용할 수 없습니다. 체험 자료는 새로고침하면 사라질 수 있습니다.",
      );
    }
  }, [demo]);
  useEffect(() => {
    setNotices([]);
    setLessons([]);
    setComments([]);
    setBookmarks([]);
    if (!db || mode === "demo") return;
    const failed = (e: Error) => {
      if (sharedId) {
        setLessons([]);
        setComments([]);
      }
      setError(`데이터를 불러오지 못했습니다: ${e.message}`);
    };
    const unsubs: (() => void)[] = [];
    if (sharedId) {
      unsubs.push(
        onSnapshot(
          doc(db, "lessons", sharedId),
          (s) => {
            setLessons(s.exists() ? [{ ...s.data(), id: s.id } as Lesson] : []);
            if (!s.exists()) setError("공유된 수업을 찾을 수 없습니다.");
          },
          failed,
        ),
      );
      unsubs.push(
        onSnapshot(
          collection(db, "lessons", sharedId, "comments"),
          (s) =>
            setComments(
              s.docs
                .map((d) => ({ ...d.data(), id: d.id }) as Comment)
                .sort((a, b) => a.createdAt - b.createdAt),
            ),
          failed,
        ),
      );
    } else if (user) {
      for (const [name, setter] of [
        ["notices", setNotices],
        ["lessons", setLessons],
      ] as const) {
        unsubs.push(
          onSnapshot(
            query(collection(db, name), where("ownerId", "==", user.uid)),
            (s) => {
              const data = s.docs
                .map((d) => ({ ...d.data(), id: d.id }))
                .sort(
                  (a, b) => (b as Notice).createdAt - (a as Notice).createdAt,
                );
              (setter as (v: unknown) => void)(data);
            },
            failed,
          ),
        );
      }
      unsubs.push(
        onSnapshot(
          doc(db, "users", user.uid),
          (s) => setBookmarks(s.data()?.bookmarks ?? []),
          failed,
        ),
      );
    }
    return () => unsubs.forEach((fn) => fn());
  }, [user, mode, sharedId]);
  // Teacher comments are subscribed only for the owner's current lessons.
  useEffect(() => {
    if (!db || !user || mode === "demo" || sharedId) return;
    const groups = new Map<string, Comment[]>();
    const unsubs = lessons.map((l) =>
      onSnapshot(
        collection(db, "lessons", l.id, "comments"),
        (s) => {
          groups.set(
            l.id,
            s.docs.map((d) => ({ ...d.data(), id: d.id }) as Comment),
          );
          setComments(
            [...groups.values()]
              .flat()
              .sort((a, b) => a.createdAt - b.createdAt),
          );
        },
        (e) => setError(e.message),
      ),
    );
    return () => unsubs.forEach((fn) => fn());
  }, [lessons, user, mode, sharedId]);
  const access = () => {
    if (mode !== "demo" && (!user || !db))
      throw new Error("Google 로그인 후 저장하거나 체험 모드를 선택해 주세요.");
  };
  const login = async () => {
    if (!auth) throw new Error("Firebase 설정이 필요합니다.");
    await signInWithPopup(auth, new GoogleAuthProvider());
    setMode("cloud");
    setError("");
  };
  const logout = async () => {
    if (auth) await signOut(auth);
    setMode("cloud");
  };
  const saveNotice = async (
    data: Omit<Notice, "id" | "createdAt" | "ownerId">,
    id?: string,
  ) => {
    access();
    validateNotice(data);
    data = noticeFields(data);
    const row = {
      ...data,
      ownerId: mode === "demo" ? "demo" : user!.uid,
      createdAt: Date.now(),
    };
    if (mode === "demo") {
      setDemo((d) => ({
        ...d,
        notices: id
          ? d.notices.map((n) => (n.id === id ? { ...n, ...data } : n))
          : [{ ...row, id: crypto.randomUUID() }, ...d.notices],
      }));
      return;
    }
    if (id) {
      const prior = notices.find((n) => n.id === id);
      if (!prior) throw new Error("공지를 찾을 수 없습니다.");
      await setDoc(doc(db!, "notices", id), {
        ...row,
        createdAt: prior.createdAt,
      });
    } else await addDoc(collection(db!, "notices"), row);
  };
  const deleteNotice = async (id: string) => {
    access();
    if (mode === "demo")
      setDemo((d) => ({ ...d, notices: d.notices.filter((n) => n.id !== id) }));
    else await deleteDoc(doc(db!, "notices", id));
  };
  const saveLesson = async (
    data: Omit<Lesson, "id" | "createdAt" | "ownerId">,
    id?: string,
  ) => {
    access();
    validateLesson(data);
    data = lessonFields(data);
    const row = {
      ...data,
      ownerId: mode === "demo" ? "demo" : user!.uid,
      createdAt: Date.now(),
    };
    if (mode === "demo") {
      setDemo((d) => ({
        ...d,
        lessons: id
          ? d.lessons.map((l) => (l.id === id ? { ...l, ...data } : l))
          : [{ ...row, id: crypto.randomUUID() }, ...d.lessons],
      }));
      return;
    }
    if (id) {
      const prior = lessons.find((l) => l.id === id);
      if (!prior) throw new Error("수업을 찾을 수 없습니다.");
      await setDoc(doc(db!, "lessons", id), {
        ...row,
        createdAt: prior.createdAt,
      });
    } else await addDoc(collection(db!, "lessons"), row);
  };
  const deleteLesson = async (id: string) => {
    access();
    if (mode === "demo")
      setDemo((d) => ({
        ...d,
        lessons: d.lessons.filter((l) => l.id !== id),
        comments: d.comments.filter((c) => c.lessonId !== id),
      }));
    else {
      await updateDoc(doc(db!, "lessons", id), { shared: false });
      const children = await getDocs(
        collection(db!, "lessons", id, "comments"),
      );
      for (let i = 0; i < children.docs.length; i += 400) {
        const batch = writeBatch(db!);
        children.docs.slice(i, i + 400).forEach((c) => batch.delete(c.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db!, "lessons", id));
    }
  };
  const addComment = async (lessonId: string, text: string, alias: string) => {
    access();
    if (
      !text.trim() ||
      text.length > 2000 ||
      !alias.trim() ||
      alias.length > 30
    )
      throw new Error("별명(30자 이내)과 댓글(2,000자 이내)을 입력해 주세요.");
    const row = {
      lessonId,
      text: text.trim(),
      alias: alias.trim(),
      ownerId: mode === "demo" ? "demo" : user!.uid,
      createdAt: Date.now(),
    };
    if (mode === "demo")
      setDemo((d) => ({
        ...d,
        comments: [...d.comments, { ...row, id: crypto.randomUUID() }],
      }));
    else await addDoc(collection(db!, "lessons", lessonId, "comments"), row);
  };
  const toggleBookmark = async (id: string) => {
    access();
    if (mode === "demo")
      setDemo((d) => ({
        ...d,
        bookmarks: d.bookmarks.includes(id)
          ? d.bookmarks.filter((x) => x !== id)
          : [...d.bookmarks, id],
      }));
    else {
      const next = bookmarks.includes(id)
        ? bookmarks.filter((x) => x !== id)
        : [...bookmarks, id];
      await setDoc(doc(db!, "users", user!.uid), { bookmarks: next });
    }
  };
  const showingDemo = mode === "demo" || (!user && !sharedId);
  return {
    user,
    mode,
    ready,
    error,
    notices: showingDemo ? demo.notices : notices,
    lessons: showingDemo ? demo.lessons : lessons,
    comments: showingDemo ? demo.comments : comments,
    bookmarks: showingDemo ? demo.bookmarks : bookmarks,
    login,
    logout,
    saveNotice,
    deleteNotice,
    saveLesson,
    deleteLesson,
    addComment,
    toggleBookmark,
    switchToDemo: () => {
      if (sharedId) window.history.replaceState({}, "", "/");
      setSharedId(null);
      setMode("demo");
      setError("");
    },
  };
}
