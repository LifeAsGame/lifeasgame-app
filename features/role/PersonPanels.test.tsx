import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { PersonDetail, PersonInput } from "@/shared/api/types";
import PersonPanels from "./PersonPanels";
import { personProfile } from "./PersonProfile";

const api = vi.hoisted(() => ({ listPersonsApi: vi.fn(), getPersonApi: vi.fn(), createPersonApi: vi.fn(), updatePersonApi: vi.fn(), archivePersonApi: vi.fn() }));
vi.mock("./api", () => api);
const alex: PersonDetail = { id: 7, displayName: "Alex", notes: "메모", birthday: "1995-06-18", contact: null, profile: personProfile({ ...personProfile(), hobbies: ["독서"], interests: ["역사"], nickname: "알렉스" }), linkedUserId: null, status: "ACTIVE", createdAt: "", updatedAt: "", version: 0 };
const bea: PersonDetail = { ...alex, id: 8, displayName: "Bea", notes: "Bea notes" };
let current: PersonDetail;
let created: PersonDetail | null;
const base = { active: true, createRequest: 0, onBack: vi.fn() };
const openEdit = async () => { fireEvent.keyDown(await screen.findByRole("button", { name: /Alex.*인물/ }), { key: "F10", shiftKey: true }); fireEvent.click(screen.getByRole("button", { name: "수정" })); await screen.findByLabelText("인물 이름"); };
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; };

beforeEach(() => {
  vi.clearAllMocks(); current = alex; created = null;
  api.listPersonsApi.mockResolvedValue([alex, bea]);
  api.getPersonApi.mockImplementation((id: number) => Promise.resolve(id === 7 ? current : id === 9 ? created : bea));
  api.createPersonApi.mockImplementation((body: PersonInput) => { created = { ...alex, ...body, id: 9 }; return Promise.resolve(created); });
  api.updatePersonApi.mockImplementation((_id: number, body: PersonInput) => { current = { ...current, ...body }; return Promise.resolve(current); });
});

it("keeps the upper Person entry and removes the duplicate row from the list", async () => {
  render(<PersonPanels {...base} />);
  await screen.findByRole("button", { name: /Alex.*인물/ });
  expect(screen.queryByRole("button", { name: "인물" })).not.toBeInTheDocument();
  expect(document.querySelector('[data-stage-key="person-detail"]')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Alex.*인물/ }));
  expect(await screen.findByText("알렉스")).toBeInTheDocument();
  expect(screen.getByText("독서")).toBeInTheDocument();
  expect(screen.queryByText("미등록")).not.toBeInTheDocument();
});

it("creates with optional profile fields, verifies re-read, and returns through Back without a Cancel button", async () => {
  const view = render(<PersonPanels {...base} />);
  await screen.findByRole("button", { name: /Alex.*인물/ });
  view.rerender(<PersonPanels {...base} createRequest={1} />);
  expect(screen.queryByRole("button", { name: "취소" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("인물 이름"), { target: { value: "새 인물" } });
  fireEvent.change(screen.getByLabelText("생일"), { target: { value: "2000-02-29" } });
  fireEvent.click(screen.getByText("취미와 취향"));
  fireEvent.change(screen.getByLabelText("취미"), { target: { value: "산책" } });
  fireEvent.keyDown(screen.getByLabelText("취미"), { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
  await waitFor(() => expect(api.createPersonApi).toHaveBeenCalledWith(expect.objectContaining({ displayName: "새 인물", birthday: "2000-02-29", profile: expect.objectContaining({ hobbies: ["산책"] }) })));
  expect(await screen.findByRole("button", { name: /Alex.*인물/ })).toBeInTheDocument();
  view.rerender(<PersonPanels {...base} createRequest={2} />);
  fireEvent.change(screen.getByLabelText("인물 이름"), { target: { value: "초안" } });
  fireEvent.click(screen.getByRole("button", { name: "인물 목록으로" }));
  expect(api.createPersonApi).toHaveBeenCalledTimes(1);
  view.rerender(<PersonPanels {...base} createRequest={3} />);
  expect(screen.getByLabelText("인물 이름")).toHaveValue("");
});

it("edits one tag while preserving another, then clears an optional field", async () => {
  render(<PersonPanels {...base} />); await openEdit();
  expect(screen.getByLabelText("별명·호칭")).toHaveValue("알렉스");
  fireEvent.click(screen.getByText("취미와 취향"));
  fireEvent.click(screen.getByRole("button", { name: "취미 독서 제거" }));
  fireEvent.change(screen.getByLabelText("별명·호칭"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
  await waitFor(() => expect(api.updatePersonApi).toHaveBeenCalledWith(7, expect.objectContaining({ profile: expect.objectContaining({ nickname: null, hobbies: [], interests: ["역사"] }) })));
  expect(await screen.findByText("역사")).toBeInTheDocument();
  expect(screen.queryByText("알렉스")).not.toBeInTheDocument();
});

it("does not claim profile success from an old server and ignores a late detail after reentry", async () => {
  api.getPersonApi.mockResolvedValueOnce(alex).mockResolvedValueOnce({ ...alex, profile: undefined });
  const view = render(<PersonPanels {...base} />); await openEdit();
  fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("확장 정보가 재조회에서 확인되지 않았습니다");
  expect(screen.getByLabelText("인물 이름")).toHaveValue("Alex");
  const gate = deferred<PersonDetail>();
  api.getPersonApi.mockReturnValueOnce(gate.promise);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  fireEvent.click(screen.getByRole("button", { name: /Alex.*인물/ }));
  view.rerender(<PersonPanels {...base} reentryRequest={1} />);
  await act(async () => gate.resolve({ ...alex, notes: "늦은 상세" }));
  expect(screen.queryByText("늦은 상세")).not.toBeInTheDocument();
});

it("blocks extended writes when the connected server list has no profile contract", async () => {
  api.listPersonsApi.mockResolvedValue([{ ...alex, profile: undefined }]);
  const view = render(<PersonPanels {...base} />);
  await screen.findByRole("button", { name: /Alex.*인물/ });
  view.rerender(<PersonPanels {...base} createRequest={1} />);
  fireEvent.change(screen.getByLabelText("인물 이름"), { target: { value: "Test" } });
  fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
  expect(screen.getByRole("alert")).toHaveTextContent("저장하지 않았습니다");
  expect(api.createPersonApi).not.toHaveBeenCalled();
});

it("does not reopen Person detail after a save resolves in another category", async () => {
  const gate = deferred<PersonDetail>();
  api.updatePersonApi.mockReturnValueOnce(gate.promise);
  const view = render(<PersonPanels {...base} />); await openEdit();
  fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
  view.rerender(<PersonPanels {...base} active={false} />);
  await act(async () => gate.resolve(alex));
  view.rerender(<PersonPanels {...base} />);
  expect(document.querySelector('[data-stage-key="person-detail"]')).not.toBeInTheDocument();
});
