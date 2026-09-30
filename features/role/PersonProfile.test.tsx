import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PersonProfileForm } from "./PersonProfile";

it("keeps age tied to a visible date and preserves optional repeated values on save", () => {
  const onSave = vi.fn();
  render(<PersonProfileForm pending={false} error={null} onSave={onSave} />);
  fireEvent.change(screen.getByLabelText("인물 이름"), { target: { value: "Alex" } });
  fireEvent.change(screen.getByLabelText("기록 당시 만 나이"), { target: { value: "0" } });
  expect(screen.getByLabelText("나이 기준일")).not.toHaveValue("");
  fireEvent.click(screen.getByText("연락 방법"));
  fireEvent.click(screen.getByRole("button", { name: "연락 방법 추가" }));
  fireEvent.change(screen.getByLabelText("연락 방법 1 값"), { target: { value: "alex-id" } });
  fireEvent.click(screen.getByText("중요한 날짜·기타"));
  fireEvent.click(screen.getByRole("button", { name: "사용자 추가 항목 추가" }));
  fireEvent.change(screen.getByLabelText("추가 항목 1 이름"), { target: { value: "색" } });
  fireEvent.change(screen.getByLabelText("추가 항목 1 내용"), { target: { value: "파랑" } });
  fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ profile: expect.objectContaining({ ageAtReference: 0, ageReferenceDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), contactChannels: [{ kind: "OTHER", label: null, value: "alex-id" }], customNotes: [{ label: "색", value: "파랑" }] }) }));
});
