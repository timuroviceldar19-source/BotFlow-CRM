import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BotFlow CRM — Автоматизация верификации лидов",
    template: "%s | BotFlow CRM",
  },
  description:
    "Универсальное решение для настройки воронки регистрации и верификации пользователей в Telegram. CRM-панель, аналитика и автоматизация.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
      </body>
    </html>
  );
}
