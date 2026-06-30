import type { PracticeInstructionalAction } from "@/types";
import type { PracticeTurnAssessment } from "@/lib/ai/practice/trainer";

export const averageCriterionScore = (assessment: PracticeTurnAssessment) => {
    if (assessment.criteria.length === 0) return 0;

    return Math.round(
        assessment.criteria.reduce((total, criterion) => total + criterion.score, 0) /
            assessment.criteria.length,
    );
};

export const chooseInstructionalAction = ({
    assessment,
    turnCount,
    hintCount,
    remainingSeconds,
}: {
    assessment: PracticeTurnAssessment;
    turnCount: number;
    hintCount: number;
    remainingSeconds: number;
}): PracticeInstructionalAction => {
    if (remainingSeconds <= 0) return "complete";

    const averageScore = averageCriterionScore(assessment);
    const allCriteriaMet =
        assessment.criteria.length > 0 && assessment.criteria.every((criterion) => criterion.met);

    if (averageScore >= 90 || (allCriteriaMet && averageScore >= 75 && turnCount >= 2)) {
        return "advance";
    }

    // Keep a scenario moving even when mastery is incomplete; the checkpoint records the gap.
    if (turnCount >= 4) return "advance";

    if (assessment.misconceptions.length > 0 && hintCount === 0) return "remediate";
    if (averageScore < 45 && hintCount < 2) return "coach";
    if (turnCount === 1) return "probe";
    if (averageScore >= 70) return "challenge";

    return "probe";
};

export const stageForAction = (
    action: PracticeInstructionalAction,
): "opening" | "scenario" | "probe" | "coach" | "complete" => {
    if (action === "opening") return "opening";
    if (action === "complete") return "complete";
    if (action === "coach" || action === "remediate") return "coach";
    if (action === "probe" || action === "challenge") return "probe";
    return "scenario";
};
