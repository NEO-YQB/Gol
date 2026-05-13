import "./globals.css";

export const metadata = {
  title: "Golino | گلینو",
  description: "Golino Coming Soon Page",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
