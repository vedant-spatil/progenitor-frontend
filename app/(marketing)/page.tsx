import { Hero } from "@/components/landing/Hero";
import { PreviewSection } from "@/components/landing/PreviewWindow";
import {
  ClinicianSection,
  DeployPanel,
  FeatureGrid,
  FinalCta,
  LedgerStrip,
  ListPanel,
  LogoStrip,
  McpSection,
} from "@/components/landing/Sections";

// Landing page (docs/LANDING.md). Static: no backend calls.
export default function Landing() {
  return (
    <>
      <Hero />
      <PreviewSection />
      <LogoStrip />
      <FeatureGrid />
      <ClinicianSection />
      <LedgerStrip />
      <ListPanel />
      <DeployPanel />
      <McpSection />
      <FinalCta />
    </>
  );
}
