import { test } from "node:test";
import assert from "node:assert/strict";
import { getYoutubeId, validateNotice, validateLesson } from "../src/model.ts";
test("YouTube watch, short and embed URLs resolve to one safe video ID", () => {
  for (const url of [
    "https://www.youtube.com/watch?v=G4H1N_yXBiA&t=3",
    "https://youtu.be/G4H1N_yXBiA",
    "https://youtube.com/shorts/G4H1N_yXBiA",
    "https://www.youtube.com/embed/G4H1N_yXBiA",
  ])
    assert.equal(getYoutubeId(url), "G4H1N_yXBiA");
});
test("rejects untrusted hosts, protocols and malformed IDs", () => {
  for (const url of [
    "https://evil.com/watch?v=G4H1N_yXBiA",
    "https://youtube.com.evil.com/watch?v=G4H1N_yXBiA",
    "javascript:alert(1)",
    "https://youtu.be/bad",
    "garbage",
  ])
    assert.equal(getYoutubeId(url), null);
});
test("requires a title and category, bounds stored content", () => {
  const valid = {
    title: "학교 공지",
    body: "내용",
    category: "학교" as const,
    subject: "교무부",
    dueDate: "2026-10-25",
    pinned: false,
    done: false,
  };
  assert.doesNotThrow(() => validateNotice(valid));
  assert.throws(() => validateNotice({ ...valid, title: " " }));
  assert.throws(() => validateNotice({ ...valid, body: "x".repeat(20001) }));
  assert.throws(() => validateNotice({ ...valid, dueDate: "bad" }));
});
test("lessons require an embed-safe video ID", () => {
  const valid = {
    title: "수업",
    description: "내용",
    subject: "과학",
    youtubeId: "G4H1N_yXBiA",
    shared: false,
  };
  assert.doesNotThrow(() => validateLesson(valid));
  assert.throws(() => validateLesson({ ...valid, youtubeId: '"><script>' }));
});
test("completion payload strips document IDs and immutable ownership fields", async () => {
  const { noticeFields, lessonFields } = await import("../src/model.ts");
  const n = {
    id: "n1",
    ownerId: "teacher",
    createdAt: 1,
    title: " 공지 ",
    body: "내용",
    category: "학교" as const,
    subject: "국어",
    dueDate: "",
    pinned: false,
    done: true,
  };
  assert.deepEqual(
    Object.keys(noticeFields(n)).sort(),
    [
      "title",
      "body",
      "category",
      "subject",
      "dueDate",
      "pinned",
      "done",
    ].sort(),
  );
  assert.equal(noticeFields(n).done, true);
  assert.equal(noticeFields(n).title, "공지");
  assert.equal(
    "id" in
      lessonFields({
        id: "l1",
        title: "수업",
        description: "",
        subject: "",
        youtubeId: "G4H1N_yXBiA",
        shared: false,
      } as unknown as Parameters<typeof lessonFields>[0]),
    false,
  );
});
