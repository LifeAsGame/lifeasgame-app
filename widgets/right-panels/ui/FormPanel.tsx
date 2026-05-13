"use client";

import { useState } from "react";
import { SAO, INPUT_STYLE_DARK as INPUT_STYLE } from "@/shared/design/tokens";
import type { FormFieldSpec, PanelStackItem } from "@/entities/nav";
import { UI_CONSTS } from "@/shared/lib/uiConsts";
import SaoAlert from "@/shared/ui/SaoAlert";
import { PanelFrame, BackButton } from "./PanelFrame";
import { D, actionBtnStyle } from "./styles";

function FormFieldInput({
  field,
  value,
  onChange,
  prefilled,
}: {
  field: FormFieldSpec;
  value: string;
  onChange: (val: string) => void;
  prefilled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const style = {
    ...INPUT_STYLE,
    ...(focused
      ? { border: `1px solid ${SAO.color.border.gold}` }
      : prefilled && value
      ? { border: `1px solid rgba(248,197,78,0.65)`, background: "rgba(248,197,78,0.08)" }
      : {}),
  };

  if (field.type === "select") {
    return (
      <select
        title={field.label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={style}
      >
        <option value="">Select…</option>
        {field.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={field.placeholder}
        rows={3}
        style={{ ...style, resize: "vertical", minHeight: "72px" }}
      />
    );
  }
  return (
    <input
      type={field.type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={field.placeholder}
      style={style}
    />
  );
}

export function FormPanel({
  panel,
  panelIndex,
  onSubmit,
  onBack,
  onFieldChange,
  depth,
}: {
  panel: Extract<PanelStackItem, { kind: "form" }>;
  panelIndex: number;
  onSubmit: (formKey: string, values: Record<string, string>) => void;
  onBack: (panelIndex: number) => void;
  onFieldChange?: (formKey: string, fieldKey: string, value: string) => void;
  depth?: number;
}) {
  const [values, setValues] = useState<Record<string, string>>(panel.prefillValues ?? {});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setValue = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    onFieldChange?.(panel.formKey, key, val);
  };

  return (
    <PanelFrame
      title={panel.title}
      resetScrollKey={panel.id}
      backButton={<BackButton onClick={() => onBack(panelIndex)} />}
      depth={depth}
    >
      <div className="space-y-3" style={{ paddingInline: UI_CONSTS.rightPanels.panelContentPaddingX }}>
        {panel.fields.map((field) => (
          <div key={field.key}>
            <p
              className="mb-1 uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.18em", color: D.label }}
            >
              {field.label}
              {field.required ? <span style={{ marginLeft: "2px", color: SAO.color.action.danger }}>*</span> : null}
            </p>
            <FormFieldInput
              field={field}
              value={values[field.key] ?? ""}
              onChange={(val) => setValue(field.key, val)}
              prefilled={Boolean(panel.prefillValues?.[field.key])}
            />
          </div>
        ))}
        <button
          type="button"
          className="mt-2 transition-opacity hover:opacity-85 active:scale-[0.98]"
          style={actionBtnStyle}
          onClick={() => setConfirmOpen(true)}
        >
          {panel.submitLabel ?? "등록"}
        </button>
      </div>
      <SaoAlert
        isOpen={confirmOpen}
        title={panel.title}
        message="저장하시겠습니까?"
        onConfirm={() => { setConfirmOpen(false); onSubmit(panel.formKey, values); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </PanelFrame>
  );
}
