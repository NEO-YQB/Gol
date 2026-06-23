import "./globals.css";
import "./info-pages.css";

export const metadata = {
  title: "گلینو | بازار گل و هدیه",
  description: "خرید آنلاین گل، باکس هدیه و سفارش از فروشگاه‌های منتخب گلینو",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body className="font-yekan">{children}</body>
    </html>
  );
}
