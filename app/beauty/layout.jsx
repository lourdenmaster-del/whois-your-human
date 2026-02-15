import { Cormorant_Garamond } from "next/font/google";

const beautySerif = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-beauty-serif",
});

export const metadata = {
  title: "Beauty",
  description: "Your Beauty Signature begins here. Beauty is coherent aliveness.",
};

export default function BeautyLayout({ children }) {
  return (
    <div className={`${beautySerif.variable} beauty-theme relative`}>
      {/* Full-viewport background — fixed layer outside main so it can't be clipped */}
      <div
        aria-hidden
        className="fixed inset-0 overflow-hidden"
        style={{ zIndex: -1 }}
      >
        <img
          src="/beauty-background.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </div>
      {children}
    </div>
  );
}
