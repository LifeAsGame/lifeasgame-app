import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect } from "vitest";

export async function answerDialog(yes = true) {
  const dialog = screen.getByRole("dialog");
  const message = dialog.textContent;
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toHaveFocus());
  await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: yes ? "확인" : "취소" })); });
  return message;
}
