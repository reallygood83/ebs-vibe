import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { test, before, after } from "node:test";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-ebs-vibe",
    firestore: {
      host: "127.0.0.1",
      port: 8085,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
after(async () => {
  await env.cleanup();
});
const notice = {
  title: "테스트",
  body: "공지",
  category: "학교",
  subject: "국어",
  dueDate: "",
  pinned: false,
  done: false,
  createdAt: 1,
  ownerId: "teacher",
};
const lesson = {
  title: "수업",
  description: "활동",
  subject: "과학",
  youtubeId: "G4H1N_yXBiA",
  shared: false,
  ownerId: "teacher",
  createdAt: 1,
};
test("private announcements: owner CRUD, outsider and guest denied", async () => {
  const a = env.authenticatedContext("teacher").firestore(),
    b = env.authenticatedContext("student").firestore(),
    g = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(a, "notices", "n1"), notice));
  await assertSucceeds(getDoc(doc(a, "notices", "n1")));
  await assertSucceeds(
    setDoc(doc(a, "notices", "n1"), { ...notice, done: true }),
  );
  await assertFails(getDoc(doc(b, "notices", "n1")));
  await assertFails(getDoc(doc(g, "notices", "n1")));
  await assertFails(
    setDoc(doc(b, "notices", "n1"), { ...notice, ownerId: "student" }),
  );
  await assertFails(setDoc(doc(a, "notices", "bad"), { ...notice, title: "" }));
  await assertSucceeds(
    getDocs(query(collection(a, "notices"), where("ownerId", "==", "teacher"))),
  );
  await assertSucceeds(deleteDoc(doc(a, "notices", "n1")));
});
test("shared video readable by link, student comments authenticated, ownership protected", async () => {
  const a = env.authenticatedContext("teacher").firestore(),
    b = env.authenticatedContext("student").firestore(),
    g = env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(a, "lessons", "l1"), lesson));
  await assertFails(getDoc(doc(b, "lessons", "l1")));
  await assertSucceeds(
    setDoc(doc(a, "lessons", "l1"), { ...lesson, shared: true }),
  );
  await assertSucceeds(getDoc(doc(g, "lessons", "l1")));
  await assertFails(getDocs(collection(g, "lessons")));
  const c = {
    lessonId: "l1",
    text: "새로 알게 됐어요",
    alias: "별빛",
    ownerId: "student",
    createdAt: 2,
  };
  await assertSucceeds(setDoc(doc(b, "lessons/l1/comments/c1"), c));
  await assertFails(setDoc(doc(g, "lessons/l1/comments/guest"), c));
  await assertFails(
    setDoc(doc(b, "lessons/l1/comments/spoof"), { ...c, ownerId: "teacher" }),
  );
  await assertFails(
    setDoc(doc(b, "lessons", "l1"), {
      ...lesson,
      ownerId: "student",
      shared: true,
    }),
  );
  await assertSucceeds(setDoc(doc(a, "lessons", "l1"), lesson));
  await assertFails(getDocs(collection(b, "lessons/l1/comments")));
  await assertSucceeds(getDocs(collection(a, "lessons/l1/comments")));
});
test("bookmark documents are private and bounded", async () => {
  const a = env.authenticatedContext("teacher").firestore(),
    b = env.authenticatedContext("student").firestore();
  await assertSucceeds(setDoc(doc(a, "users/teacher"), { bookmarks: ["n1"] }));
  await assertFails(getDoc(doc(b, "users/teacher")));
  await assertFails(
    setDoc(doc(a, "users/teacher"), { bookmarks: [], role: "admin" }),
  );
});
