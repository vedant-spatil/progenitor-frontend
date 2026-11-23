// Static, fictional patients for the landing preview. No backend call (docs/LANDING.md 2.3).
import breastCancer from "./patients/breast-cancer.json";
import ckd from "./patients/ckd.json";
import diabetes from "./patients/diabetes.json";

export type VerdictStatus = "met" | "not_met" | "unknown";

export type PreviewCriterion = { text: string; status: VerdictStatus; evidence?: string };
export type PreviewTrial = { nct: string; title: string; status: string; criteria: PreviewCriterion[] };
export type PreviewPatient = {
  id: string;
  tab: string;
  name: string;
  age: number;
  record: Record<string, unknown>;
  trials: PreviewTrial[];
};

export const patients = [diabetes, breastCancer, ckd] as PreviewPatient[];
