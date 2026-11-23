import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Sections";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
