"use client";

import { FormEvent, useEffect, useState } from "react";

type Side = "신랑" | "신부" | "공통";
type PayType = "현금" | "계좌";

type Contribution = {
  id: string;
  rowNumber?: number;
  name: string;
  side: Side;
  relation: string;
  amount: number;
  payType: PayType;
  memo: string;
  createdAt: string;
};

type SheetStatus = {
  count: number;
  totalAmount: number;
  contributions?: Contribution[];
  updatedAt: string;
};

type Toast = {
  tone: "success" | "error";
  message: string;
};

const initialForm = {
  name: "",
  side: "신랑" as Side,
  relation: "",
  amount: "",
  payType: "현금" as PayType,
  memo: "",
};

const sideOptions: Side[] = ["신랑", "신부", "공통"];
const payTypeOptions: PayType[] = ["현금", "계좌"];

const amountPresets = [
  { label: "50,000원", value: "50,000" },
  { label: "100,000원", value: "100,000" },
];

const money = new Intl.NumberFormat("ko-KR");
const dateTime = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState("대기 중");
  const [isSaving, setIsSaving] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<SheetStatus | null>(null);
  const [sheetError, setSheetError] = useState("");
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [editingId, setEditingId] = useState("");
  const [editForm, setEditForm] = useState(initialForm);
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    void loadSheetStatus();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(nextToast: Toast) {
    setToast(nextToast);
  }

  async function loadSheetStatus() {
    setIsLoadingSheet(true);

    try {
      const response = await fetch("/api/contributions", {
        cache: "no-store",
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.reason || "sheet status failed");
      }

      const data = (await response.json()) as SheetStatus;
      setSheetStatus(data);
      setSheetError("");
    } catch (error) {
      setSheetStatus(null);
      setSheetError(
        error instanceof Error && error.message === "doGet-not-deployed"
          ? "Apps Script에 doGet 배포가 필요합니다."
          : "시트 현황을 불러오지 못했습니다.",
      );
    } finally {
      setIsLoadingSheet(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(form.amount.replaceAll(",", ""));
    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setStatus("이름과 금액을 확인해 주세요.");
      showToast({
        tone: "error",
        message: "이름과 금액을 확인해 주세요.",
      });
      return;
    }

    const nextRecord: Contribution = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      side: form.side,
      relation: form.relation.trim(),
      amount,
      payType: form.payType,
      memo: form.memo.trim(),
      createdAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setForm(initialForm);

    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextRecord),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.reason || "sync failed");
      }

      const successMessage = `${nextRecord.name} 님 접수 완료`;
      setStatus(successMessage);
      showToast({
        tone: "success",
        message: successMessage,
      });
      await loadSheetStatus();
    } catch (error) {
      const message =
        error instanceof Error && error.message === "missing-script-url"
          ? "Apps Script URL을 .env.local에 넣어 주세요."
          : "화면에는 저장됨. Apps Script 연결을 확인해 주세요.";

      setStatus(message);
      showToast({
        tone: "error",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(contribution: Contribution) {
    setEditingId(getContributionKey(contribution));
    setEditForm({
      name: contribution.name,
      side: sideOptions.includes(contribution.side) ? contribution.side : "공통",
      relation: contribution.relation,
      amount: money.format(contribution.amount),
      payType: payTypeOptions.includes(contribution.payType)
        ? contribution.payType
        : "현금",
      memo: contribution.memo,
    });
  }

  async function handleUpdate(contribution: Contribution) {
    const amount = Number(editForm.amount.replaceAll(",", ""));

    if (!contribution.id && !contribution.rowNumber) {
      showToast({
        tone: "error",
        message: "이 항목은 시트 행 정보가 없어 수정할 수 없습니다.",
      });
      return;
    }

    if (!editForm.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      showToast({
        tone: "error",
        message: "이름과 금액을 확인해 주세요.",
      });
      return;
    }

    const nextRecord: Contribution = {
      ...contribution,
      name: editForm.name.trim(),
      side: editForm.side,
      relation: editForm.relation.trim(),
      amount,
      payType: editForm.payType,
      memo: editForm.memo.trim(),
    };

    setUpdatingId(getContributionKey(contribution));

    try {
      const response = await fetch("/api/contributions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextRecord),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.reason || "update failed");
      }

      setEditingId("");
      setStatus(`${nextRecord.name} 님 수정 완료`);
      showToast({
        tone: "success",
        message: `${nextRecord.name} 님 수정 완료`,
      });
      await loadSheetStatus();
    } catch (error) {
      const message =
        error instanceof Error && error.message === "missing-script-url"
          ? "Apps Script URL을 .env.local에 넣어 주세요."
          : "수정하지 못했습니다. Apps Script 배포를 확인해 주세요.";

      showToast({
        tone: "error",
        message,
      });
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] pb-6 text-stone-950">
      {toast && (
        <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2">
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-bold shadow-lg ${
              toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
            role="status"
          >
            {toast.message}
          </div>
        </div>
      )}

      <section className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-rose-700">Gift Desk</p>
            <h1 className="text-2xl font-black tracking-normal text-stone-950">
              축의대 접수 관리
            </h1>
          </div>
          <div className="flex shrink-0 gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setStatus("목록을 비웠습니다.");
              }}
              className="h-10 rounded-md border border-rose-200 bg-rose-50 px-3 font-bold text-rose-800 transition hover:bg-rose-100"
            >
              초기화
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-md px-4 py-4">
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-bold text-stone-500">시트 총 접수</p>
            <p className="mt-1 text-2xl font-black">
              {sheetStatus ? `${sheetStatus.count}건` : "-"}
            </p>
            {sheetError && (
              <p className="mt-2 text-xs font-semibold text-rose-700">
                {sheetError}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-bold text-stone-500">시트 총 금액</p>
            <p className="mt-1 break-words text-2xl font-black">
              {sheetStatus
                ? `${money.format(sheetStatus.totalAmount)}원`
                : "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={loadSheetStatus}
            className="col-span-2 h-11 rounded-lg border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 shadow-sm transition hover:bg-stone-50"
          >
            {isLoadingSheet ? "확인 중" : "현황 새로고침"}
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <h2 className="text-lg font-black">새 접수</h2>
            <span className="max-w-44 truncate rounded-md bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
              {isSaving ? "저장 중" : status}
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-stone-700">
              이름
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                autoFocus
                className="h-14 rounded-md border border-stone-300 px-4 text-lg font-bold outline-none ring-rose-200 transition focus:ring-4"
                placeholder="예: 김민수"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              {sideOptions.map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, side }))}
                  className={`h-12 rounded-md border text-base font-black transition ${
                    form.side === side
                      ? "border-rose-700 bg-rose-700 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>

            <label className="grid gap-2 text-sm font-semibold text-stone-700">
              관계
              <input
                value={form.relation}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    relation: event.target.value,
                  }))
                }
                className="h-12 rounded-md border border-stone-300 px-3 text-base outline-none ring-rose-200 transition focus:ring-4"
                placeholder="예: 회사, 친구, 친척"
              />
            </label>

            <div className="grid gap-2 text-sm font-semibold text-stone-700">
              <p>금액</p>
              <div className="grid grid-cols-2 gap-2">
                {amountPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        amount: preset.value,
                      }))
                    }
                    className={`h-14 rounded-md border text-lg font-black transition ${
                      form.amount === preset.value
                        ? "border-rose-700 bg-rose-700 text-white"
                        : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <label>
                <span className="sr-only">직접 금액 입력</span>
                <input
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value.replace(/[^\d,]/g, ""),
                    }))
                  }
                  className="h-14 w-full rounded-md border border-stone-300 px-4 text-lg font-black outline-none ring-rose-200 transition focus:ring-4"
                  placeholder="직접 입력"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {payTypeOptions.map((payType) => (
                <button
                  key={payType}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, payType }))}
                  className={`h-12 rounded-md border text-base font-black transition ${
                    form.payType === payType
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {payType}
                </button>
              ))}
            </div>

            <label className="grid gap-2 text-sm font-semibold text-stone-700">
              메모
              <textarea
                value={form.memo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, memo: event.target.value }))
                }
                className="min-h-16 rounded-md border border-stone-300 px-4 py-3 text-base outline-none ring-rose-200 transition focus:ring-4"
                placeholder="봉투 번호, 대신 전달 등"
              />
            </label>

            <button
              type="submit"
              disabled={isSaving}
              className="sticky bottom-3 h-14 rounded-md bg-rose-700 px-4 text-lg font-black text-white shadow-lg shadow-rose-900/20 transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSaving ? "저장 중" : "접수 등록"}
            </button>
          </div>
        </form>

        <section className="mt-4 rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
            <h2 className="text-lg font-black">접수 목록</h2>
            <span className="text-xs font-bold text-stone-500">
              {sheetStatus ? `${sheetStatus.count}건` : "시트 기준"}
            </span>
          </div>

          {sheetError ? (
            <p className="px-4 py-5 text-sm font-semibold text-rose-700">
              {sheetError}
            </p>
          ) : isLoadingSheet && !sheetStatus ? (
            <p className="px-4 py-5 text-sm font-semibold text-stone-500">
              불러오는 중
            </p>
          ) : sheetStatus?.contributions?.length ? (
            <ul className="divide-y divide-stone-100">
              {sheetStatus.contributions.map((contribution, index) => (
                <li
                  key={getContributionKey(contribution, index)}
                  className="px-4 py-3"
                >
                  {editingId === getContributionKey(contribution, index) ? (
                    <div className="grid gap-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                        <label className="grid min-w-0 gap-1 text-xs font-bold text-stone-600">
                          이름
                          <input
                            value={editForm.name}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            className="h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-base font-bold text-stone-950 outline-none ring-rose-200 transition focus:ring-4"
                          />
                        </label>
                        <label className="grid min-w-0 gap-1 text-xs font-bold text-stone-600">
                          금액
                          <input
                            inputMode="numeric"
                            value={editForm.amount}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                amount: event.target.value.replace(/[^\d,]/g, ""),
                              }))
                            }
                            className="h-11 w-full min-w-0 rounded-md border border-stone-300 px-3 text-right text-base font-black text-stone-950 outline-none ring-rose-200 transition focus:ring-4"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {sideOptions.map((side) => (
                          <button
                            key={side}
                            type="button"
                            onClick={() =>
                              setEditForm((current) => ({ ...current, side }))
                            }
                            className={`h-10 rounded-md border text-sm font-black transition ${
                              editForm.side === side
                                ? "border-rose-700 bg-rose-700 text-white"
                                : "border-stone-300 bg-white text-stone-700"
                            }`}
                          >
                            {side}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {payTypeOptions.map((payType) => (
                          <button
                            key={payType}
                            type="button"
                            onClick={() =>
                              setEditForm((current) => ({ ...current, payType }))
                            }
                            className={`h-10 rounded-md border text-sm font-black transition ${
                              editForm.payType === payType
                                ? "border-stone-950 bg-stone-950 text-white"
                                : "border-stone-300 bg-white text-stone-700"
                            }`}
                          >
                            {payType}
                          </button>
                        ))}
                      </div>

                      <label className="grid gap-1 text-xs font-bold text-stone-600">
                        관계
                        <input
                          value={editForm.relation}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              relation: event.target.value,
                            }))
                          }
                          className="h-10 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-950 outline-none ring-rose-200 transition focus:ring-4"
                        />
                      </label>

                      <label className="grid gap-1 text-xs font-bold text-stone-600">
                        메모
                        <textarea
                          value={editForm.memo}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              memo: event.target.value,
                            }))
                          }
                          className="min-h-14 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-950 outline-none ring-rose-200 transition focus:ring-4"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void handleUpdate(contribution)}
                          disabled={
                            updatingId === getContributionKey(contribution, index)
                          }
                          className="h-11 rounded-md bg-stone-950 text-sm font-black text-white transition hover:bg-stone-800 disabled:bg-stone-400"
                        >
                          {updatingId === getContributionKey(contribution, index)
                            ? "저장 중"
                            : "저장"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId("")}
                          className="h-11 rounded-md border border-stone-300 bg-white text-sm font-black text-stone-800 transition hover:bg-stone-50"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-black text-stone-950">
                              {contribution.name || "이름 없음"}
                            </p>
                            <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">
                              {contribution.side}
                            </span>
                            {contribution.payType && (
                              <span className="rounded bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-800">
                                {contribution.payType}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-stone-500">
                            {[contribution.relation, contribution.memo]
                              .filter(Boolean)
                              .join(" · ") || "상세 없음"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-base font-black text-stone-950">
                            {money.format(contribution.amount)}원
                          </p>
                          <p className="mt-1 text-xs font-semibold text-stone-500">
                            {formatCreatedAt(contribution.createdAt)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => startEditing(contribution)}
                        disabled={!contribution.id && !contribution.rowNumber}
                        className="h-10 rounded-md border border-stone-300 bg-white text-sm font-black text-stone-800 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
                      >
                        수정
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-sm font-semibold text-stone-500">
              아직 접수된 내역이 없습니다.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateTime.format(date);
}

function getContributionKey(contribution: Contribution, fallbackIndex = 0) {
  return (
    contribution.id ||
    (contribution.rowNumber ? `row-${contribution.rowNumber}` : "") ||
    `${contribution.createdAt}-${fallbackIndex}`
  );
}
