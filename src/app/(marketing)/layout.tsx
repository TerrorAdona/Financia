import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

/** Layout des pages publiques : header marketing + contenu centré + footer. */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6">
        {children}
      </main>
      <Footer />
    </>
  );
}
