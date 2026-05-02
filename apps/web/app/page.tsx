import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BotFlow CRM — Автоматизация верификации лидов в Telegram",
  description:
    "Универсальное решение для настройки воронки продаж в Telegram: бот, API, лендинг и админ-панель.",
  openGraph: {
    title: "BotFlow CRM — Автоматизация верификации лидов",
    description:
      "Настройте свою воронку регистрации и верификации пользователей через Telegram за считанные минуты.",
    type: "website",
  },
};

const benefits = [
  {
    title: "Автоматическая воронка",
    body: "Пользователь проходит путь от первого сообщения до верификации по заданному вами сценарию.",
  },
  {
    title: "Партнёрские интеграции",
    body: "Отслеживайте регистрации и конверсии через Webhooks от ваших партнёров или внешних систем.",
  },
  {
    title: "Telegram-первый подход",
    body: "Весь процесс взаимодействия происходит в мессенджере. Никаких лишних паролей и регистраций.",
  },
];

const partners = [
  {
    name: "SaaS Platform",
    offer: "Пробный период 30 дней",
    promoCode: "BOTFLOW2026",
    features: ["CRM интеграция", "API доступ", "Поддержка 24/7"],
    rating: "4.8",
  },
  {
    name: "Market Service",
    offer: "Скидка 20% на первый месяц",
    promoCode: "FLOWDEAL",
    features: ["Быстрый старт", "Мобильное приложение", "Аналитика"],
    rating: "4.6",
  },
  {
    name: "Dev Agency",
    offer: "Бесплатная консультация",
    promoCode: "BOTCRM",
    features: ["Индивидуальный подход", "Гарантия результата", "Экспертность"],
    rating: "4.5",
  },
];

const steps = [
  {
    number: "01",
    title: "Запуск бота",
    body: "Пользователь переходит в Telegram-бот по вашей ссылке с UTM-метками.",
  },
  {
    number: "02",
    title: "Регистрация",
    body: "Бот направляет пользователя на сайт партнёра для выполнения целевого действия.",
  },
  {
    number: "03",
    title: "Верификация",
    body: "Пользователь отправляет подтверждение (скриншот), который проверяется модератором.",
  },
  {
    number: "04",
    title: "Результат",
    body: "После одобрения пользователь получает доступ к продукту или услуге.",
  },
];

const faq = [
  {
    question: "Как работает система?",
    answer:
      "BotFlow CRM предоставляет готовую инфраструктуру для отслеживания пути пользователя от клика по рекламе до подтверждения конверсии.",
  },
  {
    question: "Можно ли подключить своих партнёров?",
    answer:
      "Да, система поддерживает работу с любыми внешними сервисами через настраиваемые ссылки и Webhooks.",
  },
  {
    question: "Как быстро проходит проверка?",
    answer:
      "Модератор получает уведомление в админ-панели и может одобрить или отклонить заявку в один клик.",
  },
  {
    question: "Какие данные собирает система?",
    answer:
      "Мы сохраняем ID пользователя в Telegram, его статус в воронке, UTM-метки и историю событий.",
  },
  {
    question: "Есть ли API для интеграции?",
    answer:
      "Да, доступно полноценное REST API для управления пользователями, просмотра статистики и получения уведомлений.",
  },
];

const metrics = [
  { label: "Конверсия в регистрацию", value: "25%+" },
  { label: "Время проверки лида", value: "5 мин" },
  { label: "Доступность системы", value: "99.9%" },
  { label: "Обработано запросов", value: "10 000+" },
];

export default function HomePage() {
  return (
    <main className="page-shell">
      {/* Hero */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">BotFlow CRM — Lead Generation Ecosystem</p>
          <h1>Автоматизируйте путь вашего клиента в Telegram.</h1>
          <p className="hero-text">
            Готовая воронка для захвата лидов, верификации регистраций и отслеживания конверсий.
            Управляйте трафиком и партнёрами через единую панель управления.
          </p>
          <div className="cta-row">
            <a
              className="primary-btn"
              href="https://t.me/botflow_crm_bot?start=src-landing__utm_source-seo__utm_campaign-main"
            >
              Запустить демо-бота
            </a>
            <a className="secondary-btn" href="#partners">
              Наши партнёры
            </a>
          </div>
        </div>
        <div className="hero-panel">
          <span className="panel-kicker">Статистика платформы</span>
          <div className="metric-list">
            {metrics.map((metric) => (
              <div key={metric.label} className="metric-row">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section-grid">
        {benefits.map((card) => (
          <article key={card.title} className="info-card">
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      {/* How it works */}
      <section className="section-box landing-section">
        <p className="eyebrow">Процесс работы</p>
        <h2>4 шага к успешной конверсии</h2>
        <div className="steps-grid">
          {steps.map((step) => (
            <div key={step.number} className="step-card">
              <span className="step-number">{step.number}</span>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Partner comparison */}
      <section id="partners" className="section-box landing-section">
        <p className="eyebrow">Партнёрская сеть</p>
        <h2>Доступные предложения от партнёров</h2>
        <div className="partner-grid">
          {partners.map((partner) => (
            <article key={partner.name} className="partner-card">
              <div className="partner-header">
                <strong className="partner-name">{partner.name}</strong>
                <span className="partner-rating">{partner.rating}/5</span>
              </div>
              <div className="partner-bonus">
                <span className="small-label">Оффер</span>
                <strong>{partner.offer}</strong>
              </div>
              <div className="partner-promo">
                <span className="small-label">Промокод</span>
                <code>{partner.promoCode}</code>
              </div>
              <ul className="partner-features">
                {partner.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a
                className="primary-btn partner-cta"
                href={`https://t.me/botflow_crm_bot?start=src-landing__partner-${partner.name.toLowerCase()}__utm_campaign-compare`}
              >
                Активировать
              </a>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="section-box landing-section">
        <p className="eyebrow">Вопросы и ответы</p>
        <h2>Частые вопросы</h2>
        <div className="faq-list">
          {faq.map((item) => (
            <details key={item.question} className="faq-item">
              <summary className="faq-question">{item.question}</summary>
              <p className="faq-answer">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="section-box landing-section cta-section">
        <p className="eyebrow">Готовы масштабировать трафик?</p>
        <h2>Присоединяйтесь к BotFlow CRM сегодня</h2>
        <p className="hero-text">
          Полный контроль над вашим воронками, партнёрами и лидами в реальном времени.
        </p>
        <div className="cta-row">
          <a
            className="primary-btn"
            href="https://t.me/botflow_crm_bot?start=src-landing__utm_source-seo__utm_campaign-main-cta"
          >
            Попробовать бесплатно
          </a>
          <a className="secondary-btn" href="/dashboard">
            Открыть дашборд
          </a>
        </div>
      </section>

      {/* Legal footer */}
      <footer className="landing-footer">
        <p>
          BotFlow CRM — это техническая платформа для автоматизации маркетинговых воронок в Telegram.
          Мы предоставляем инструменты для отслеживания и верификации лидов.
        </p>
        <p>
          Все торговые марки принадлежат их владельцам. Использование сервиса подразумевает
          согласие с условиями использования и политикой конфиденциальности.
        </p>
        <nav className="footer-links">
          <a href="/promos">Офферы</a>
          <a href="/articles">Блог</a>
          <a href="/dashboard">Дашборд</a>
        </nav>
      </footer>
    </main>
  );
}
