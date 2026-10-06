"use client";

import { useEffect } from "react";
import { validDateInput } from "@/shared/lib/dateInput";

export default function DateInputGuard() {
  useEffect(() => {
    const handleSubmit = (event: Event) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      const inputs = event.target.querySelectorAll<HTMLInputElement>('input[type="date"], input[type="datetime-local"]');
      for (const input of inputs) {
        if (input.disabled || validDateInput(input.value, input.type, input.min, input.max)) continue;
        event.preventDefault(); event.stopImmediatePropagation();
        input.setCustomValidity(`양력 ${input.min ? input.min.slice(0, 4) : "0001"}~9999년의 올바른 날짜를 입력하세요.`);
        input.reportValidity();
        return;
      }
    };
    const handleInput = (event: Event) => {
      if (event.target instanceof HTMLInputElement && ["date", "datetime-local"].includes(event.target.type)) event.target.setCustomValidity("");
    };
    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("input", handleInput, true);
    return () => { document.removeEventListener("submit", handleSubmit, true); document.removeEventListener("input", handleInput, true); };
  }, []);
  return null;
}
