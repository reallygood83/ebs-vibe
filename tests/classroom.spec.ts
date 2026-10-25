import { test, expect } from "@playwright/test";
test("teacher records and searches notice, bookmarks it, checks calendar and keeps saved record", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "직접 체험하기" }).click();
  await page.getByRole("button", { name: "새 공지 등록" }).click();
  const form = page.getByRole("dialog");
  await form.locator("[name=title]").fill("QA 수행평가 안내");
  await form.locator("[name=body]").fill("실험 보고서를 준비해 주세요.");
  await form.locator("[name=category]").selectOption("수행평가");
  await form.locator("[name=dueDate]").fill("2026-10-28");
  await form.getByRole("button", { name: "공지 저장하기" }).click();
  await expect(
    page.getByRole("heading", { name: "QA 수행평가 안내" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "공지 검색" }).fill("실험 보고서");
  await expect(
    page.getByRole("heading", { name: "QA 수행평가 안내" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "QA 수행평가 안내 저장", exact: true })
    .click();
  await page
    .getByRole("button", { name: "QA 수행평가 안내 완료 표시", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "QA 수행평가 안내 미완료 표시",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "직접 체험하기" }).click();
  await page
    .getByRole("button", { name: "저장한 항목 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "QA 수행평가 안내" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "일정 캘린더", exact: true }).click();
  await expect(page.locator(".calendar-panel")).toContainText(
    "QA 수행평가 안내",
  );
});
test("YouTube topic embeds, comments persist, malformed URLs rejected and demo share is labeled", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "직접 체험하기" }).click();
  await page.getByRole("button", { name: "영상 수업", exact: true }).click();
  await page
    .getByRole("button", { name: "영상 수업 만들기", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.locator("[name=title]").fill("QA 영상 활동");
  await dialog
    .locator("[name=description]")
    .fill("새로 알게 된 점을 적어 보세요.");
  await dialog
    .locator("[name=url]")
    .fill("https://example.com/watch?v=G4H1N_yXBiA");
  await dialog.getByRole("button", { name: "영상 수업 저장" }).click();
  await expect(dialog.getByRole("status")).toContainText("올바른 YouTube");
  await dialog
    .locator("[name=url]")
    .fill("https://www.youtube.com/watch?v=G4H1N_yXBiA");
  await dialog.getByRole("button", { name: "영상 수업 저장" }).click();
  await page.getByRole("button", { name: "QA 영상 활동", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/G4H1N_yXBiA",
  );
  await dialog.locator("[name=alias]").fill("별빛");
  await dialog.locator("[name=text]").fill("지구를 지키는 방법을 배웠어요.");
  await dialog.getByRole("button", { name: "댓글 남기기" }).click();
  await expect(dialog.locator(".comment")).toContainText(
    "지구를 지키는 방법을 배웠어요.",
  );
  await dialog.getByRole("button", { name: "학생에게 공유" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "체험 수업은 공유할 수 없습니다",
  );
  await dialog.getByRole("button", { name: "닫기", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "직접 체험하기" }).click();
  await page.getByRole("button", { name: "영상 수업", exact: true }).click();
  await page.getByRole("button", { name: "QA 영상 활동", exact: true }).click();
  await expect(page.locator(".comment")).toContainText("별빛");
});
test("mobile dashboard fits viewport and menu opens", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "오늘도, 가벼운 학교생활" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator(".mobile-menu").click();
  await expect(
    page.getByRole("button", { name: "공지 모아보기 6" }),
  ).toBeVisible();
});
