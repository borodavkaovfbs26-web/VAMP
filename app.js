const sb = window.vampSupabase;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => r.querySelectorAll(s);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

const fmt = d => d
  ? new Date(d).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" })
  : "—";

const levels = ["A1", "A2", "B1", "B2", "C1"];

const nav = [
  ["home", "⌂", "Головна"],
  ["lessons", "▤", "Навчання"],
  ["grammar", "✦", "Граматика"],
  ["dictionary", "▧", "Словник"],
  ["tasks", "☑", "Завдання"],
  ["schedule", "▦", "Розклад"],
  ["messages", "✉", "Повідомлення"],
  ["profile", "◎", "Профіль"]
];

const grammar = [
  ["A1", "To be: am / is / are", "Побудова стверджень, заперечень і запитань із дієсловом to be.", ["I am a student.", "She is not tired.", "Are they at home?"], "Використовуємо am з I, is з he/she/it, are з you/we/they."],
  ["A1", "Present Simple", "Звички, факти та регулярні дії.", ["I study every day.", "He works in a bank.", "Do you like music?"], "У he/she/it додаємо -s/-es. Для запитань використовуємо do/does."],
  ["A1", "Articles: a / an / the", "Неозначений та означений артиклі.", ["a book", "an apple", "the sun"], "A/an — один предмет, згаданий уперше; the — конкретний або відомий предмет."],
  ["A2", "Past Simple", "Завершені дії в минулому.", ["I visited London yesterday.", "She didn't call me.", "Did you see it?"], "Правильні дієслова мають -ed; неправильні мають другу форму."],
  ["A2", "Future: will / going to", "Рішення, прогнози та плани.", ["I'll help you.", "It's going to rain.", "Are you going to study?"], "Will — спонтанне рішення/прогноз; going to — намір або очевидний прогноз."],
  ["A2", "Comparatives and superlatives", "Порівняння прикметників.", ["smaller than", "more interesting than", "the best"], "Короткі прикметники: -er/-est; довгі: more/most."],
  ["B1", "Present Perfect", "Досвід і результат, пов'язаний із теперішнім.", ["I have finished my work.", "Have you ever been there?", "She hasn't arrived yet."], "Have/has + третя форма дієслова. Часто вживаємо ever, never, already, yet."],
  ["B1", "First Conditional", "Реальна умова в майбутньому.", ["If it rains, I'll stay home.", "If you study, you will pass."], "If + Present Simple, will + infinitive. Після if зазвичай не ставимо will."],
  ["B1", "Modal verbs", "Можливість, обов'язок, порада.", ["You must wear a seat belt.", "You should rest.", "Can I ask a question?"], "Must — сильний обов'язок; should — порада; can — можливість/дозвіл."],
  ["B2", "Passive Voice", "Коли важлива дія або результат, а не виконавець.", ["The room is cleaned daily.", "The book was written in 1998."], "Форма be + past participle; час змінюється у be."],
  ["B2", "Second Conditional", "Уявні або малоймовірні ситуації.", ["If I had more time, I'd travel.", "What would you do?"], "If + Past Simple, would + infinitive."],
  ["B2", "Reported Speech", "Передавання чужих слів.", ["She said she was tired.", "He told me he had left."], "Часто відбувається зсув часу назад: am → was, will → would."],
  ["C1", "Mixed Conditionals", "Умовні речення зі змішаними часовими рамками.", ["If I had studied, I would have a better job now."], "Поєднуємо умову в минулому з наслідком у теперішньому або навпаки."],
  ["C1", "Inversion", "Інверсія для наголосу та формального стилю.", ["Never have I seen such a view.", "Rarely does he complain."], "Після негативних прислівників на початку речення використовуємо допоміжне дієслово перед підметом."]
];

const exercises = [
  { q: "Choose the correct form: She ___ a doctor.", a: ["am", "is", "are"], c: 1, why: "She поєднується з is." },
  { q: "Choose: They ___ football every Saturday.", a: ["plays", "play", "playing"], c: 1, why: "З they у Present Simple використовуємо базову форму play." },
  { q: "Past Simple: I ___ to school yesterday.", a: ["go", "went", "gone"], c: 1, why: "Go — went — gone." },
  { q: "Present Perfect: She has ___ her homework.", a: ["finish", "finished", "finishing"], c: 1, why: "Після has потрібна третя форма (past participle)." },
  { q: "Passive: The emails ___ every morning.", a: ["send", "are sent", "sent"], c: 1, why: "Present Simple Passive: am/is/are + V3." },
  { q: "First Conditional: If I see him, I ___ him.", a: ["will tell", "told", "would tell"], c: 0, why: "If + Present Simple, will + infinitive." }
];

let user = null;
let profile = null;
let active = "home";
let lesson = null;
let localStream = null;
let peer = null;
let channel = null;

function toast(m) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.append(t);
  }
  t.textContent = m;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 4200);
}

async function init() {
  if (!sb) {
    document.body.innerHTML = '<div class="auth"><div class="authbox"><h1>VAMP</h1><p>Не підключено Supabase. Перевір supabase.js.</p></div></div>';
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  user = session?.user;

  if (location.pathname.endsWith("login.html")) {
    renderLogin();
    return;
  }

  if (!user) {
    location.href = "login.html";
    return;
  }

  const { data: p, error } = await sb.from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    toast("Не вдалося завантажити профіль: " + error.message);
    return;
  }

  profile = p;

  if (!profile) {
    document.body.innerHTML = '<div class="auth"><div class="authbox"><h1>Профіль ще не створено</h1><p>Попроси адміністратора завершити створення твого акаунта.</p><button onclick="sb.auth.signOut().then(()=>location.href=\'login.html\')">Вийти</button></div></div>';
    return;
  }

  if (profile.role === "pending") {
    document.body.innerHTML = '<div class="auth"><div class="authbox"><h1>Очікуємо активацію</h1><p>Адміністратор має призначити тобі роль.</p><button onclick="sb.auth.signOut().then(()=>location.href=\'login.html\')">Вийти</button></div></div>';
    return;
  }

  renderShell();
  await renderPage();
}
