import { getLocale } from "./i18n.js";

const FAQ = {
  fr: [
    {
      q: "Suis-je concerné par la facturation électronique de 2026 ?",
      a: "Oui. Les auto-entrepreneurs et artisans sont concernés. Réception obligatoire dès sept. 2026, émission dès sept. 2027. Exxon-bat vous aide à préparer vos devis et factures en amont.",
    },
    {
      q: "En quoi Exxon-bat est différent des autres logiciels ?",
      a: "Avant d'envoyer un devis, vous savez si vous gagnez <strong>vraiment</strong> : URSSAF, impôts, matériel, main-d'œuvre et charges fixes sont déjà déduits. Vous voyez le <strong>bénéfice net dans votre poche</strong> — plus le pipeline commercial, les paiements et le planning synchronisés.",
    },
    {
      q: "Est-ce que je n'aurai plus à me soucier de l'URSSAF ou des impôts ?",
      a: "Exxon-bat <strong>intègre cotisations sociales et impôts estimés</strong> dans chaque analyse de devis — vous anticipez au lieu de subir. Les déclarations officielles restent entre vos mains et celles de votre comptable ; l'app vous aide à chiffrer juste pour que le bénéfice reste dans votre entreprise.",
    },
    {
      q: "Comment éviter les devis en dessous du prix réel ?",
      a: "Le calculateur affiche un <strong>prix minimum conseillé</strong>, alerte si le matériel est sous-facturé et indique un verdict Rentable / Limite / Déficitaire. Vous n'envoyez plus un devis perdant par mégarde.",
    },
    {
      q: "Quelle offre choisir selon mon profil ?",
      a: "<strong>Essai gratuit 30 jours</strong> — entrez votre e-mail pour tester l'offre Pro sans carte bancaire. Ensuite : <strong>Devis & factures (19,90 €/mois)</strong>, <strong>Pro (79,90 €/mois)</strong> ou <strong>Business (99,90 €/mois)</strong>.",
    },
    {
      q: "Exxon-bat remplace-t-il mon expert-comptable ?",
      a: "Non. Il complète le travail de votre comptable. Les calculs de rentabilité sont indicatifs. Votre comptable valide les aspects fiscaux.",
    },
    {
      q: "Puis-je transmettre mes données à mon comptable ?",
      a: "Oui. Les offres Pro et Business incluent des exports comptables simplifiés.",
    },
    {
      q: "Comment fonctionne le calculateur de rentabilité ?",
      a: "Configurez votre profil une fois. À chaque devis, Exxon-bat déduit cotisations, impôts et frais pour afficher marge nette et prix minimum conseillé.",
    },
    {
      q: "Utilisable sur chantier sans internet ?",
      a: "Oui. Exxon-bat fonctionne hors connexion (PWA). Créez et consultez vos devis sur chantier.",
    },
    {
      q: "Les auto-entrepreneurs sont-ils pris en charge ?",
      a: "Oui. Taux URSSAF par activité, versement libératoire et seuils de CA — avec analyse de rentabilité sur chaque devis.",
    },
    {
      q: "Mes données sont-elles sécurisées ?",
      a: "Compte protégé, échanges HTTPS, données jamais revendues. Vous restez propriétaire de vos informations.",
    },
    {
      q: "Planning chantier avec diagramme de Gantt ?",
      a: "Oui, avec l'offre Business : Gantt par chantier, <strong>agenda unifié</strong>, vue disponibilités, file « À planifier » et <strong>rappels e-mail/notification la veille</strong> de chaque RDV.",
    },
    {
      q: "Puis-je envoyer un lien de paiement à mon client ?",
      a: "Oui (offre Pro). Lien sécurisé pour acompte, solde ou montant libre : IBAN, référence virement, page client dédiée. L'encaissement met à jour le devis et le pipeline commercial.",
    },
    {
      q: "La gestion commerciale est-elle liée aux devis ?",
      a: "Oui. Chaque devis imprimé entre dans le pipeline (envoyé, en attente, validé, chantier, payé). RDV, relances et statuts se mettent à jour partout — devis, commercial et paiements.",
    },
    {
      q: "Puis-je changer d'offre ou résilier ?",
      a: "Oui, à tout moment. Facturation mensuelle ou annuelle — sans engagement de durée.",
    },
  ],
  en: [
    {
      q: "Am I affected by 2026 e-invoicing?",
      a: "Yes. Self-employed tradespeople are concerned. Mandatory reception from Sept. 2026, issuing from Sept. 2027. Exxon-bat helps you prepare quotes and invoices in advance.",
    },
    {
      q: "How is Exxon-bat different from other software?",
      a: "Before sending a quote, you know if you really earn: social charges, tax, materials, labour and fixed costs are already deducted. You see <strong>net profit in your pocket</strong> — plus synced sales pipeline, payments and scheduling.",
    },
    {
      q: "Will I still need to worry about social charges or tax?",
      a: "Exxon-bat <strong>includes social contributions and estimated tax</strong> in every quote analysis — you anticipate instead of suffering surprises. Official filings remain with you and your accountant; the app helps you price correctly so profit stays in your business.",
    },
    {
      q: "How do I avoid quotes below real cost?",
      a: "The calculator shows an <strong>advised minimum price</strong>, alerts if materials are under-priced and gives a Profitable / Borderline / Loss verdict. You no longer send a losing quote by mistake.",
    },
    {
      q: "Which plan fits my profile?",
      a: "<strong>30-day free trial</strong> — enter your email to test Pro without a credit card. Then: <strong>Quotes & invoices (€19.90/mo)</strong>, <strong>Pro (€79.90/mo)</strong> or <strong>Business (€99.90/mo)</strong>.",
    },
    {
      q: "Does Exxon-bat replace my accountant?",
      a: "No. It complements your accountant. Profitability figures are indicative. Your accountant validates tax aspects.",
    },
    {
      q: "Can I share data with my accountant?",
      a: "Yes. Pro and Business plans include simplified accounting exports.",
    },
    {
      q: "How does the profitability calculator work?",
      a: "Set up your profile once. On each quote, Exxon-bat deducts contributions, tax and costs to show net margin and minimum advised price.",
    },
    {
      q: "Can I use it on site without internet?",
      a: "Yes. Exxon-bat works offline (PWA). Create and view quotes on site.",
    },
    {
      q: "Is self-employment supported?",
      a: "Yes. Social contribution rates by activity, flat-rate tax options and turnover thresholds — plus profitability on every quote.",
    },
    {
      q: "Is my data secure?",
      a: "Protected account, HTTPS, data never sold. You own your business information.",
    },
    {
      q: "Job-site planning with Gantt chart?",
      a: "Yes, with the Business plan: Gantt per job, <strong>unified calendar</strong>, availability view, « To schedule » queue and <strong>email/notification reminders the day before</strong> each appointment.",
    },
    {
      q: "Can I send a payment link to my client?",
      a: "Yes (Pro plan). Secure link for deposit, balance or custom amount: bank details, payment reference, dedicated client page. Payment updates the quote and sales pipeline.",
    },
    {
      q: "Is sales management linked to quotes?",
      a: "Yes. Every printed quote enters the pipeline (sent, pending, approved, job site, paid). Appointments, follow-ups and statuses update everywhere — quotes, sales and payments.",
    },
    {
      q: "Can I change plan or cancel?",
      a: "Yes, anytime. Monthly or annual billing — no long-term commitment.",
    },
  ],
  pt: [
    {
      q: "Estou abrangido pela faturação eletrónica de 2026?",
      a: "Sim. Artesãos e autoempreendedores estão abrangidos. Receção obrigatória a partir de set. 2026, emissão a partir de set. 2027. Exxon-bat ajuda a preparar orçamentos e faturas.",
    },
    {
      q: "Em que é Exxon-bat diferente de outros softwares?",
      a: "Antes de enviar um orçamento, sabe se ganha <strong>realmente</strong>: encargos sociais, impostos, material, mão de obra e custos fixos já deduzidos. Vê o <strong>lucro líquido no bolso</strong> — mais pipeline comercial, pagamentos e planning sincronizados.",
    },
    {
      q: "Ainda terei de me preocupar com encargos sociais ou impostos?",
      a: "Exxon-bat <strong>integra cotizações e impostos estimados</strong> em cada análise de orçamento — antecipa em vez de sofrer surpresas. As declarações oficiais ficam consigo e com o contabilista; a app ajuda a precificar bem para o lucro ficar na empresa.",
    },
    {
      q: "Como evitar orçamentos abaixo do preço real?",
      a: "A calculadora mostra um <strong>preço mínimo aconselhado</strong>, alerta se o material está subfaturado e indica veredito Rentável / Limite / Deficitário. Não envia mais um orçamento perdido por engano.",
    },
    {
      q: "Que plano escolher?",
      a: "<strong>Teste grátis 30 dias</strong> — introduza o e-mail para testar Pro sem cartão. Depois: <strong>Orçamentos e faturas (19,90 €/mês)</strong>, <strong>Pro (79,90 €/mês)</strong> ou <strong>Business (99,90 €/mês)</strong>.",
    },
    {
      q: "Exxon-bat substitui o meu contabilista?",
      a: "Não. Complementa o trabalho do contabilista. Os cálculos são indicativos.",
    },
    {
      q: "Posso enviar dados ao contabilista?",
      a: "Sim. Os planos Pro e Business incluem exportações contabilísticas.",
    },
    {
      q: "Como funciona a calculadora de rentabilidade?",
      a: "Configure o perfil uma vez. Em cada orçamento, Exxon-bat deduz encargos e custos para mostrar margem líquida e preço mínimo.",
    },
    {
      q: "Funciona em obra sem internet?",
      a: "Sim. Exxon-bat funciona offline (PWA). Crie e consulte orçamentos em campo.",
    },
    {
      q: "Autoempreendedores são suportados?",
      a: "Sim. Taxas de contribuições, opções fiscais e limites de faturação — com rentabilidade em cada orçamento.",
    },
    {
      q: "Os meus dados estão seguros?",
      a: "Conta protegida, HTTPS, dados nunca vendidos. Você é dono das suas informações.",
    },
    {
      q: "Planeamento de obras com Gantt?",
      a: "Sim, com o plano Business: Gantt por obra, <strong>agenda unificada</strong>, vista de disponibilidades, fila « A planificar » e <strong>lembretes e-mail/notificação na véspera</strong> de cada RDV.",
    },
    {
      q: "Posso enviar um link de pagamento ao cliente?",
      a: "Sim (plano Pro). Link seguro para adiantamento, saldo ou montante livre: IBAN, referência, página cliente. O encaixe atualiza o orçamento e o pipeline comercial.",
    },
    {
      q: "A gestão comercial está ligada aos orçamentos?",
      a: "Sim. Cada orçamento impresso entra no pipeline (enviado, pendente, validado, obra, pago). RDV, relances e estados atualizam-se em todo o lado.",
    },
    {
      q: "Posso mudar de plano ou cancelar?",
      a: "Sim, a qualquer momento. Faturação mensal ou anual — sem compromisso.",
    },
  ],
  it: [
    {
      q: "Sono interessato dalla fatturazione elettronica 2026?",
      a: "Sì. Artigiani e liberi professionisti sono interessati. Ricezione obbligatoria da set. 2026, emissione da set. 2027. Exxon-bat aiuta a preparare preventivi e fatture.",
    },
    {
      q: "In cosa Exxon-bat è diverso dagli altri software?",
      a: "Prima di inviare un preventivo, sapete se guadagnate <strong>davvero</strong>: contributi, tasse, materiali, manodopera e costi fissi già dedotti. Vedete l'<strong>utile netto in tasca</strong> — più pipeline commerciale, pagamenti e planning sincronizzati.",
    },
    {
      q: "Dovrò ancora preoccuparmi di contributi o tasse?",
      a: "Exxon-bat <strong>integra contributi sociali e tasse stimate</strong> in ogni analisi — anticipate invece di subire sorprese. Le dichiarazioni ufficiali restano tra voi e il commercialista; l'app aiuta a prezzare correttamente.",
    },
    {
      q: "Come evitare preventivi sotto il prezzo reale?",
      a: "Il calcolatore mostra un <strong>prezzo minimo consigliato</strong>, avvisa se i materiali sono sottofatturati e indica un verdetto Redditizio / Limite / Deficitario.",
    },
    {
      q: "Quale piano scegliere?",
      a: "<strong>Prova gratuita 30 giorni</strong> — inserite l'e-mail per testare Pro senza carta. Poi: <strong>Preventivi e fatture (19,90 €/mese)</strong>, <strong>Pro (79,90 €/mese)</strong> o <strong>Business (99,90 €/mese)</strong>.",
    },
    {
      q: "Exxon-bat sostituisce il commercialista?",
      a: "No. Completa il lavoro del commercialista. I calcoli sono indicativi.",
    },
    {
      q: "Posso trasmettere i dati al commercialista?",
      a: "Sì. I piani Pro e Business includono export contabili.",
    },
    {
      q: "Come funziona il calcolatore di redditività?",
      a: "Configurate il profilo una volta. Su ogni preventivo, Exxon-bat deduce contributi e costi per mostrare margine netto e prezzo minimo.",
    },
    {
      q: "Utilizzabile in cantiere senza internet?",
      a: "Sì. Exxon-bat funziona offline (PWA). Create e consultate preventivi in cantiere.",
    },
    {
      q: "I liberi professionisti sono supportati?",
      a: "Sì. Aliquote contributive, opzioni fiscali e soglie di fatturato — con redditività su ogni preventivo.",
    },
    {
      q: "I miei dati sono sicuri?",
      a: "Account protetto, HTTPS, dati mai rivenduti. Restate proprietari delle informazioni.",
    },
    {
      q: "Pianificazione cantieri con Gantt?",
      a: "Sì, con il piano Business: Gantt per cantiere, <strong>agenda unificata</strong>, disponibilità, coda « Da pianificare » e <strong>promemoria e-mail/notifica il giorno prima</strong> di ogni appuntamento.",
    },
    {
      q: "Posso inviare un link di pagamento al cliente?",
      a: "Sì (piano Pro). Link sicuro per acconto, saldo o importo libero: IBAN, riferimento, pagina cliente. L'incasso aggiorna preventivo e pipeline.",
    },
    {
      q: "La gestione commerciale è collegata ai preventivi?",
      a: "Sì. Ogni preventivo stampato entra nel pipeline (inviato, in attesa, validato, cantiere, pagato). Appuntamenti e stati si aggiornano ovunque.",
    },
    {
      q: "Posso cambiare piano o disdire?",
      a: "Sì, in qualsiasi momento. Fatturazione mensile o annuale — senza vincoli.",
    },
  ],
  es: [
    {
      q: "¿Me afecta la facturación electrónica de 2026?",
      a: "Sí. Autónomos y artesanos están afectados. Recepción obligatoria desde sept. 2026, emisión desde sept. 2027. Exxon-bat ayuda a preparar presupuestos y facturas.",
    },
    {
      q: "¿En qué se diferencia Exxon-bat de otros software?",
      a: "Antes de enviar un presupuesto, sabe si gana <strong>realmente</strong>: cotizaciones, impuestos, material, mano de obra y costes fijos ya deducidos. Ve el <strong>beneficio neto en el bolsillo</strong> — más pipeline comercial, pagos y planning sincronizados.",
    },
    {
      q: "¿Tendré que preocuparme aún por cotizaciones o impuestos?",
      a: "Exxon-bat <strong>integra cotizaciones e impuestos estimados</strong> en cada análisis — anticipe en lugar de sufrir sorpresas. Las declaraciones oficiales siguen siendo suyas y de su contable; la app ayuda a presupuestar bien.",
    },
    {
      q: "¿Cómo evitar presupuestos por debajo del precio real?",
      a: "La calculadora muestra un <strong>precio mínimo aconsejado</strong>, alerta si el material está infravalorado e indica veredicto Rentable / Límite / Deficitario.",
    },
    {
      q: "¿Qué plan elegir?",
      a: "<strong>Prueba gratis 30 días</strong> — introduzca su e-mail para probar Pro sin tarjeta. Después: <strong>Presupuestos y facturas (19,90 €/mes)</strong>, <strong>Pro (79,90 €/mes)</strong> o <strong>Business (99,90 €/mes)</strong>.",
    },
    {
      q: "¿Exxon-bat sustituye a mi contable?",
      a: "No. Complementa el trabajo del contable. Los cálculos son indicativos.",
    },
    {
      q: "¿Puedo enviar datos a mi contable?",
      a: "Sí. Los planes Pro y Business incluyen exportaciones contables.",
    },
    {
      q: "¿Cómo funciona la calculadora de rentabilidad?",
      a: "Configure su perfil una vez. En cada presupuesto, Exxon-bat deduce cargas y costes para mostrar margen neto y precio mínimo.",
    },
    {
      q: "¿Funciona en obra sin internet?",
      a: "Sí. Exxon-bat funciona sin conexión (PWA). Cree y consulte presupuestos en obra.",
    },
    {
      q: "¿Se admiten autónomos?",
      a: "Sí. Tasas de cotizaciones, opciones fiscales y umbrales de facturación — con rentabilidad en cada presupuesto.",
    },
    {
      q: "¿Mis datos están seguros?",
      a: "Cuenta protegida, HTTPS, datos nunca vendidos. Usted es dueño de su información.",
    },
    {
      q: "¿Planificación de obras con Gantt?",
      a: "Sí, con el plan Business: Gantt por obra, <strong>agenda unificada</strong>, disponibilidad, cola « A planificar » y <strong>recordatorios e-mail/notificación la víspera</strong> de cada cita.",
    },
    {
      q: "¿Puedo enviar un enlace de pago a mi cliente?",
      a: "Sí (plan Pro). Enlace seguro para anticipo, saldo o importe libre: IBAN, referencia, página cliente. El cobro actualiza presupuesto y pipeline.",
    },
    {
      q: "¿La gestión comercial está vinculada a los presupuestos?",
      a: "Sí. Cada presupuesto impreso entra en el pipeline (enviado, pendiente, validado, obra, pagado). Citas y estados se actualizan en todas partes.",
    },
    {
      q: "¿Puedo cambiar de plan o cancelar?",
      a: "Sí, en cualquier momento. Facturación mensual o anual — sin compromiso.",
    },
  ],
};

export function renderLandingFaq() {
  const container = document.getElementById("faq-list");
  if (!container) return;

  const locale = getLocale();
  const items = FAQ[locale] ?? FAQ.fr;

  container.innerHTML = items
    .map(
      (item) => `
      <details>
        <summary>${item.q}</summary>
        <p>${item.a}</p>
      </details>
    `,
    )
    .join("");
}

window.addEventListener("localechange", renderLandingFaq);
