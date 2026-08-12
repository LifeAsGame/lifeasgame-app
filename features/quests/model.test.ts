import { describe, expect, it } from "vitest";

import { journeyMock, resetJourneyMock } from "./mock";
import { questAcceptAction } from "./model";

describe("Catalog에서 반복 Quest를 다시 수락할 때", () => {
  describe("blueprint repeatRule과 최신 acceptance 상태를 함께 판단하면", () => {
    it("미수락/CANCELED는 Accept, COMPLETED periodic은 Accept Again을 허용한다", () => {
      resetJourneyMock();
      const catalog = journeyMock.catalog();
      const acceptances = journeyMock.acceptances();
      const recovery = catalog.find(({ code }) => code === "Q_RECOVERY_REST_TEN")!;
      const weekly = catalog.find(({ code }) => code === "Q_RECORD_WEEKLY_LOOKBACK")!;
      const canceled = acceptances.find(({ code }) => code === weekly.code)!;
      const completed = { ...canceled, status: "COMPLETED" as const };

      expect(questAcceptAction(recovery, null)).toBe("accept");
      expect(questAcceptAction(weekly, canceled)).toBe("accept");
      expect(questAcceptAction(weekly, completed)).toBe("accept-again");
      expect(questAcceptAction({ ...weekly, repeatRule: "DAILY" }, completed)).toBe("accept-again");
      expect(questAcceptAction({ ...weekly, repeatRule: "MONTHLY" }, completed)).toBe("accept-again");
    });

    it("IN_PROGRESS/GOAL_REACHED와 COMPLETED non-repeatable에는 action을 만들지 않는다", () => {
      resetJourneyMock();
      const catalog = journeyMock.catalog();
      const acceptances = journeyMock.acceptances();
      const once = catalog.find(({ code }) => code === "Q_RECORD_FIRST_TRACE")!;
      const completedOnce = acceptances.find(({ code }) => code === once.code)!;
      const inProgress = acceptances.find(({ status }) => status === "IN_PROGRESS")!;
      const goalReached = acceptances.find(({ status }) => status === "GOAL_REACHED")!;

      expect(questAcceptAction(once, completedOnce)).toBeNull();
      expect(questAcceptAction({ ...once, repeatRule: "NONE" }, completedOnce)).toBeNull();
      expect(questAcceptAction(catalog.find(({ code }) => code === inProgress.code)!, inProgress)).toBeNull();
      expect(questAcceptAction(catalog.find(({ code }) => code === goalReached.code)!, goalReached)).toBeNull();
    });
  });
});
