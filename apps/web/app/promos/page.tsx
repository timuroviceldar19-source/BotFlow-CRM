import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Актуальные офферы и бонусы партнёров — BotFlow CRM",
  description:
    "Промокоды и специальные предложения от наших партнёров. Получите бонусы при регистрации через бота.",
};

const offers = [
  {
    partner: "SaaS Platform",
    code: "BOTFLOW2026",
    offer: "Пробный период 30 дней",
    conditions:
      "Доступ ко всем премиум-функциям в течение месяца. Требуется привязка аккаунта через бота.",
    rating: "4.8",
    link: "https://t.me/botflow_crm_bot?start=src-promos__partner-saas__utm_campaign-promo-page",
  },
  {
    partner: "Market Service",
    code: "FLOWDEAL",
    offer: "Скидка 20% на первый месяц",
    conditions:
      "Примените промокод при первой оплате подписки. Доступно для новых пользователей.",
    rating: "4.6",
    link: "https://t.me/botflow_crm_bot?start=src-promos__partner-market__utm_campaign-promo-page",
  },
  {
    partner: "Dev Agency",
    code: "BOTCRM",
    offer: "Бесплатная консультация",
    conditions:
      "Запишитесь на вводную сессию по внедрению CRM-системы в ваш бизнес.",
    rating: "4.5",
    link: "https://t.me/botflow_crm_bot?start=src-promos__partner-agency__utm_campaign-promo-page",
  },
  {
    partner: "Cloud Host",
    code: "FLOWHOST",
    offer: "$50 на баланс",
    conditions:
      "Бонусные средства на оплату облачных ресурсов при регистрации по нашей ссылке.",
    rating: "4.4",
    link: "https://t.me/botflow_crm_bot?start=src-promos__partner-cloud__utm_campaign-promo-page",
  },
];

export default function PromosPage() {
  return (
    <main className="page-shell">
      <section className="hero-copy" style={{ marginBottom: 0 }}>
        <p className="eyebrow">Офферы 2026</p>
        <h1 style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)" }}>
          Специальные предложения от партнёров
        </h1>
        <p className="hero-text">
          Используйте промокоды при регистрации через нашего бота и получайте бонусы. Все предложения актуальны и проверены.
        </p>
        <div className="cta-row">
          <a className="secondary-btn" href="/">
            На главную
          </a>
          <a className="secondary-btn" href="/articles">
            Статьи
          </a>
        </div>
      </section>

      <div className="promo-page-grid">
        {offers.map((promo) => (
          <article key={promo.partner} className="promo-card">
            <div className="promo-card-header">
              <strong className="partner-name">{promo.partner}</strong>
              <span className="partner-rating">{promo.rating}/5</span>
            </div>
            <div>
              <span className="small-label">Оффер</span>
              <p style={{ margin: "4px 0 0", color: "var(--mint)", fontWeight: 600 }}>
                {promo.offer}
              </p>
            </div>
            <div>
              <span className="small-label">Промокод</span>
              <div style={{ marginTop: 6 }}>
                <span className="promo-code-display">{promo.code}</span>
              </div>
            </div>
            <div>
              <span className="small-label">Условия</span>
              <p className="promo-conditions">{promo.conditions}</p>
            </div>
            <a className="primary-btn partner-cta" href={promo.link}>
              Активировать через бота
            </a>
          </article>
        ))}
      </div>

      <section className="section-box landing-section">
        <p className="eyebrow">Как получить бонус</p>
        <h2>3 простых шага</h2>
        <ol className="ordered-list">
          <li>Нажмите «Активировать через бота» — откроется Telegram.</li>
          <li>Зарегистрируйтесь по ссылке из бота и введите промокод.</li>
          <li>Пришлите скриншот в бот для верификации и получения доступа.</li>
        </ol>
      </section>

      <footer className="landing-footer">
        <p>
          Предложения актуальны на момент публикации. Условия могут быть изменены партнёрами.
        </p>
        <nav className="footer-links">
          <a href="/">Главная</a>
          <a href="/articles">Статьи</a>
          <a href="/dashboard">Дашборд</a>
        </nav>
      </footer>
    </main>
  );
}
