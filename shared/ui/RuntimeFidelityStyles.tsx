const CSS = `
.lag-notification-backdrop {
  position: fixed;
  inset: 0;
  z-index: 600000;
  background: color-mix(in srgb, var(--lag-ambient) 68%, transparent);
  backdrop-filter: blur(3px);
}

.lag-notification-dropdown {
  top: max(16px, env(safe-area-inset-top)) !important;
  bottom: max(16px, env(safe-area-inset-bottom));
  height: auto !important;
  max-height: none !important;
}

@media (max-width: 767px) {
  .lag-app-shell:has(.lag-panel-stage[data-camera-active="true"]) {
    --lag-mobile-protected-bottom: calc(148px + env(safe-area-inset-bottom));
    width: 100% !important;
    min-width: 100% !important;
    align-items: flex-start !important;
    gap: 0 !important;
    padding-inline: 16px !important;
  }

  .lag-app-shell:has(.lag-panel-stage[data-camera-active="true"]) .lag-left-anchor {
    position: absolute;
    width: 24px !important;
    min-width: 0;
    height: 1px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .lag-app-shell:has(.lag-panel-stage[data-camera-active="true"]) .lag-workspace {
    width: 100%;
    min-width: 0 !important;
  }

  .lag-workspace:has(.lag-panel-stage[data-camera-active="true"])
    .lag-panel-rail:not(:has(> .lag-panel-stage[data-camera-active="true"])) {
    position: absolute;
    width: 24px;
    min-width: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .lag-panel-rail:has(> .lag-panel-stage[data-camera-active="true"]) {
    width: calc(100vw - 32px);
    min-width: calc(100vw - 32px);
    height: calc(100dvh - 32px - var(--lag-mobile-protected-bottom));
    min-height: 0;
    align-items: stretch;
  }

  .lag-panel-rail:has(> .lag-panel-stage[data-camera-active="true"])
    > .lag-panel-stage:not([data-camera-active="true"]) {
    position: absolute;
    width: 24px !important;
    max-width: 24px !important;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .lag-panel-stage[data-camera-active="true"],
  .lag-panel-stage[data-camera-active="true"] > .lag-panel-frame {
    width: calc(100vw - 32px) !important;
    max-width: calc(100vw - 32px) !important;
  }

  .lag-panel-stage[data-camera-active="true"] > .lag-panel-frame {
    display: flex;
    height: 100%;
    max-height: 100%;
    flex-direction: column;
  }

  .lag-panel-stage[data-camera-active="true"] > .lag-panel-frame > div:last-child {
    min-height: 0;
    flex: 1 1 auto;
  }

  .lag-panel-stage[data-camera-active="true"] > .lag-panel-frame .lag-panel-body {
    height: 100%;
    max-height: none !important;
    padding-bottom: max(24px, env(safe-area-inset-bottom)) !important;
    scroll-padding-bottom: max(24px, env(safe-area-inset-bottom));
  }

  .lag-home {
    width: calc(100vw - 32px);
  }

  .lag-home-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .lag-home-section-journey {
    order: -2;
  }

  .lag-home-section-journal {
    order: -1;
  }

  .lag-home-section-journey .lag-home-list,
  .lag-home-section-journal .lag-home-list {
    grid-auto-flow: row;
    overflow: visible;
  }

  .lag-home-section-journey .lag-home-list > :not(:first-child),
  .lag-home-section-journal .lag-home-list > :not(:first-child) {
    display: none;
  }

  .lag-home-hero,
  .lag-home-section {
    gap: 8px;
    padding: 12px;
  }

  .lag-home-hero h1 {
    font-size: 1.5rem;
  }

  .lag-home-intro {
    margin-top: 4px;
    font-size: 0.82rem;
    line-height: 1.35;
  }

  .lag-home-section-journey .lag-home-action,
  .lag-home-section-journal .lag-home-action {
    min-height: 32px;
    padding: 4px 8px;
  }

  .lag-home-section-journey .lag-home-entry {
    min-height: 0;
    padding: 10px;
  }

  .lag-home-section-journey .lag-home-entry .lag-home-meta:nth-of-type(n + 3) {
    display: none;
  }

  .lag-quick-record-surface,
  .lag-quick-record-form {
    gap: 12px;
    padding-inline: 12px;
  }

  .lag-panel-stage[data-camera-active="true"] .lag-quick-record-form .lag-journal-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lag-panel-stage[data-camera-active="true"] .lag-quick-record-fields {
    min-height: 0;
    padding: 12px;
  }

  .lag-notification-dropdown {
    bottom: max(16px, env(safe-area-inset-bottom)) !important;
  }
}

@media (min-width: 1200px) {
  .lag-journal-shell:not(:has([data-stage-key="lifelog-quick-record"], [data-stage-key="lifelog-journal-detail"]))
    [data-stage-key="lifelog-journal"],
  .lag-journal-shell:not(:has([data-stage-key="lifelog-quick-record"], [data-stage-key="lifelog-journal-detail"]))
    [data-stage-key="lifelog-journal"] > .lag-panel-frame {
    width: min(1040px, calc(100vw - 560px)) !important;
    max-width: min(1040px, calc(100vw - 560px)) !important;
  }

  .lag-journal-shell:not(:has([data-stage-key="lifelog-quick-record"], [data-stage-key="lifelog-journal-detail"])),
  .lag-growth-shell {
    height: calc(100svh - 64px);
    align-items: stretch;
  }

  .lag-journal-shell:not(:has([data-stage-key="lifelog-quick-record"], [data-stage-key="lifelog-journal-detail"]))
    [data-stage-key="lifelog-journal"],
  .lag-growth-shell > .lag-panel-stage {
    height: 100%;
  }

  .lag-journal-shell:not(:has([data-stage-key="lifelog-quick-record"], [data-stage-key="lifelog-journal-detail"]))
    [data-stage-key="lifelog-journal"] > .lag-panel-frame,
  .lag-growth-shell > .lag-panel-stage > .lag-panel-frame {
    display: flex;
    height: 100%;
    max-height: 100%;
    flex-direction: column;
  }

  .lag-journal-shell:not(:has([data-stage-key="lifelog-quick-record"], [data-stage-key="lifelog-journal-detail"]))
    [data-stage-key="lifelog-journal"] > .lag-panel-frame > div:last-child,
  .lag-growth-shell > .lag-panel-stage > .lag-panel-frame > div:last-child {
    min-height: 0;
    flex: 1 1 auto;
  }

  .lag-journal-shell:not(:has([data-stage-key="lifelog-quick-record"], [data-stage-key="lifelog-journal-detail"]))
    [data-stage-key="lifelog-journal"] > .lag-panel-frame .lag-panel-body,
  .lag-growth-shell > .lag-panel-stage > .lag-panel-frame .lag-panel-body {
    height: 100%;
    max-height: none !important;
  }

  .lag-journal-shell:not(:has([data-stage-key="lifelog-quick-record"], [data-stage-key="lifelog-journal-detail"]))
    .lag-journal-entry {
    min-height: 104px;
    padding: 12px 16px;
  }

  .lag-workspace > div:has(> .lag-growth-shell)
    > .lag-panel-rail[data-main="player"] .lag-panel-title {
    overflow: visible;
    font-size: 0.78rem !important;
    letter-spacing: 0.12em !important;
    text-align: center;
    text-overflow: clip;
    white-space: normal;
  }

  .lag-workspace > div:has(> .lag-growth-shell)
    > .lag-panel-rail[data-main="player"] .lag-panel-card > div:last-child > p:first-child {
    display: block !important;
    overflow: visible !important;
    font-size: 0.82rem !important;
    letter-spacing: 0.04em !important;
    white-space: nowrap;
  }

}

@media (min-width: 1500px) {
  .lag-journey-shell:has([data-stage-key="journey-detail"])
    > [data-stage-key="journey-root"] {
    position: absolute;
    width: 24px;
    max-width: 24px;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .lag-journey-shell:has([data-stage-key="journey-detail"])
    > [data-stage-key="journey-list"],
  .lag-journey-shell:has([data-stage-key="journey-detail"])
    > [data-stage-key="journey-list"] > .lag-panel-frame {
    width: 420px !important;
    max-width: 420px !important;
  }

  .lag-journey-shell:has([data-stage-key="journey-detail"])
    > [data-stage-key="journey-detail"],
  .lag-journey-shell:has([data-stage-key="journey-detail"])
    > [data-stage-key="journey-detail"] > .lag-panel-frame {
    width: 760px !important;
    max-width: 760px !important;
  }
}
`;

export default function RuntimeFidelityStyles() {
  return <style href="lag-consumer-v7-runtime-fidelity" precedence="high">{CSS}</style>;
}
