// Demo runs are available only in an explicitly enabled local development build.
export const DEMO_ENABLED = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_PORTFOLIO_DEMO === "true";
