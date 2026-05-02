import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Блог об автоматизации маркетинга и CRM — BotFlow CRM",
  description:
    "Полезные статьи об автоматизации воронок в Telegram, управлении лидами и повышении конверсии.",
};

const articles = [
  {
    day: "01",
    month: "Апр",
    title: "Как автоматизировать воронку в Telegram: пошаговое руководство",
    summary:
      "Разбираем ключевые этапы создания эффективной воронки: от первого клика до подтверждённой конверсии.",
    tags: ["гайд", "автоматизация", "Telegram"],
    slug: "kak-avtomatizirovat-voronku",
  },
  {
    day: "31",
    month: "Мар",
    title: "Верификация лидов: зачем это нужно вашему бизнесу",
    summary:
      "Почему ручная или полуавтоматическая проверка регистраций помогает повысить качество трафика и ROI.",
    tags: ["лиды", "верификация", "ROI"],
    slug: "verifikaciya-lidov",
  },
  {
    day: "29",
    month: "Мар",
    title: "UTM-метки в Telegram: как правильно отслеживать источники",
    summary:
      "Гайд по использованию параметров в start-ссылках бота для детальной аналитики рекламных кампаний.",
    tags: ["аналитика", "UTM", "трафик"],
    slug: "utm-metki-telegram",
  },
  {
    day: "27",
    month: "Мар",
    title: "Работа с партнёрскими Webhooks: настройка постбэков",
    summary:
      "Как связать вашу CRM с внешними партнёрскими кабинетами для получения данных о регистрациях в реальном времени.",
    tags: ["API", "webhooks", "интеграции"],
    slug: "partner-webhooks",
  },
  {
    day: "25",
    month: "Мар",
    title: "Психология конверсии: как мотивировать пользователя в мессенджере",
    summary:
      "Советы по написанию текстов для бота и проектированию UX, который ведет пользователя к целевому действию.",
    tags: ["конверсия", "UX", "копирайтинг"],
    slug: "psihologiya-konversii",
  },
];

export default function ArticlesPage() {
  return (
    <main className="page-shell">
      <section className="hero-copy" style={{ marginBottom: 0 }}>
        <p className="eyebrow">Блог</p>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
          Статьи об автоматизации, лидах и CRM
        </h1>
        <p className="hero-text">
          Полезный контент для маркетологов и владельцев бизнеса: от базовых концепций до продвинутых интеграций.
        </p>
        <div className="cta-row">
          <a className="secondary-btn" href="/">
            На главную
          </a>
          <a className="secondary-btn" href="/promos">
            Офферы
          </a>
        </div>
      </section>

      <div className="article-list">
        {articles.map((article) => (
          <article key={article.slug} className="article-card">
            <div className="article-date">
              <span className="article-date-day">{article.day}</span>
              <span className="article-date-month">{article.month}</span>
            </div>
            <div className="article-body">
              <h3>{article.title}</h3>
              <p>{article.summary}</p>
              <div className="article-tags">
                {article.tags.map((tag) => (
                  <span key={tag} className="article-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="section-box landing-section cta-section">
        <p className="eyebrow">Нужна автоматизация?</p>
        <h2>Запустите свою первую воронку через BotFlow CRM</h2>
        <div className="cta-row">
          <a
            className="primary-btn"
            href="https://t.me/botflow_crm_bot?start=src-articles__utm_source-seo__utm_campaign-blog"
          >
            Запустить бота
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          BotFlow CRM — ваш надежный партнер в автоматизации маркетинга.
        </p>
        <nav className="footer-links">
          <a href="/">Главная</a>
          <a href="/promos">Офферы</a>
          <a href="/dashboard">Дашборд</a>
        </nav>
      </footer>
    </main>
  );
}
