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

  renderShell();
  await renderPage();
}
function lessonsPage(v){
 v.innerHTML=title("Навчання","Обирай рівень і проходь уроки у власному темпі.")+
 `<div class="grid">${levels.map(l=>`<div class="card col-4"><span class="pill">${l}</span><h2>${l} · ${levelName(l)}</h2><p class="muted">Граматика, лексика, читання, аудіювання та практика.</p><button data-level="${l}">Відкрити матеріали</button></div>`).join("")}</div><div id="levelContent"></div>`;
 $$("[data-level]").forEach(b=>b.onclick=()=>{
  const l=b.dataset.level;
  $("#levelContent").innerHTML=`<div class="section-head"><h2>${l}: теми курсу</h2></div><div class="lesson-grid">${grammar.filter(g=>g[0]===l).map(g=>`<div class="lesson-card" data-gram="${grammar.indexOf(g)}"><span class="pill">${l}</span><h3>${g[1]}</h3><p class="muted">${g[2]}</p><button class="secondary">Вивчати тему</button></div>`).join("")}</div>`;
  $$("[data-gram]").forEach(x=>x.onclick=()=>openGrammar(+x.dataset.gram));
 });
}

function levelName(l){
 return {A1:"Beginner",A2:"Elementary",B1:"Intermediate",B2:"Upper-Intermediate",C1:"Advanced"}[l];
}

function grammarPage(v){
 v.innerHTML=title("Граматика","Теорія у форматі слайдів, приклади та перевірка знань.")+
 `<div class="actions" style="margin-bottom:16px">${levels.map(l=>`<button class="secondary" data-filter="${l}">${l}</button>`).join("")}<button class="secondary" data-filter="all">Усі рівні</button></div><div class="lesson-grid" id="grammarList"></div>`;

 function fill(l){
  let data=grammar.map((g,i)=>({...g,i})).filter(g=>l==="all"||g[0]===l);
  $("#grammarList").innerHTML=data.map(g=>`<div class="lesson-card" data-open="${g.i}"><span class="pill">${g[0]}</span><h3>${g[1]}</h3><p class="muted">${g[2]}</p><span class="small">Слайди · приклади · тест →</span></div>`).join("")||'<p class="muted">Для цього рівня матеріали скоро з’являться.</p>';
  $$("[data-open]").forEach(b=>b.onclick=()=>openGrammar(+b.dataset.open));
 }

 fill(profile.level||"all");
 $$("[data-filter]").forEach(b=>b.onclick=()=>fill(b.dataset.filter));
}

function openGrammar(i){
 let g=grammar[i],step=0;
 const slides=[
  `<h2>${g[1]}</h2><p>${g[2]}</p>`,
  `<h2>Правило</h2><p>${g[4]}</p>`,
  `<h2>Приклади</h2>${g[3].map(x=>`<p>✦ ${x}</p>`).join("")}`
 ];

 modal(`<div class="eyebrow">${g[0]} · GRAMMAR</div><div id="slide" class="slide">${slides[0]}</div><div class="actions" style="justify-content:space-between;margin-top:15px"><button id="prev" class="secondary">← Назад</button><span class="muted" id="slideNum">1 / 4</span><button id="next">Далі →</button></div><div id="quiz" class="hidden"></div>`);

 function paint(){
  if(step<3){
   $("#slide").innerHTML=slides[step];
   $("#slideNum").textContent=`${step+1} / 4`;
   $("#prev").disabled=step===0;
   $("#next").textContent=step===2?"Перейти до тесту →":"Далі →";
   $("#slide").classList.remove("hidden");
   $("#quiz").classList.add("hidden");
  }else{
   $("#slide").classList.add("hidden");
   $("#quiz").classList.remove("hidden");
   $("#quiz").innerHTML=`<h2>Перевір себе</h2><p>${g[1]}: обери правильне твердження.</p><label><input type="radio" name="gq" value="0"> ${esc(g[3][0])}</label><label><input type="radio" name="gq" value="1"> ${esc(g[3][1])}</label><label><input type="radio" name="gq" value="2"> ${esc(g[3][2])}</label><button id="finish">Завершити тему</button>`;

   $("#finish").onclick=async()=>{
    const chosen=$('input[name="gq"]:checked');
    if(!chosen){toast("Обери відповідь");return}
    await sb.from("lesson_progress").upsert({
     user_id:user.id,
     lesson_key:g[0]+"-"+g[1],
     score:chosen.value==="0"?100:0,
     completed:true
    },{onConflict:"user_id,lesson_key"});
    toast("Результат збережено у твоєму прогресі");
    closeModal();
   };
  }
 }

 $("#prev").onclick=()=>{step=Math.max(0,step-1);paint()};
 $("#next").onclick=()=>{step=Math.min(3,step+1);paint()};
 paint();
}

function modal(html){
 let m=document.createElement("div");
 m.className="modal";
 m.id="modal";
 m.innerHTML=`<div class="modalbox"><div class="modalhead"><b>VAMP · Навчання</b><button class="secondary" id="closeModal">✕</button></div>${html}</div>`;
 document.body.append(m);
 $("#closeModal").onclick=closeModal;
}

function closeModal(){
 $("#modal")?.remove();
}
async function dictionaryPage(v){
 let data=await rows("dictionary",{user_id:user.id});

 v.innerHTML=title("Мій словник","Зберігай нові англійські слова та повторюй їх.")+
 `<div class="grid">
   <div class="card col-4">
    <h2>Додати слово</h2>
    <form id="wordForm" class="list">
     <label>Англійське слово<input name="word" required placeholder="Наприклад: beautiful"></label>
     <label>Переклад<input name="translation" required placeholder="Наприклад: красивий"></label>
     <label>Приклад речення<textarea name="example" placeholder="The weather is beautiful."></textarea></label>
     <button>Зберегти слово</button>
    </form>
   </div>
   <div class="card col-8">
    <div class="section-head"><h2>Мої слова</h2><span class="pill">${data.length} слів</span></div>
    <input id="wordSearch" placeholder="Пошук слова або перекладу…">
    <div class="list" id="wordList"></div>
   </div>
  </div>`;

 function showWords(search=""){
  const filtered=data.filter(w=>
   w.word.toLowerCase().includes(search.toLowerCase())||
   w.translation.toLowerCase().includes(search.toLowerCase())
  );

  $("#wordList").innerHTML=filtered.map(w=>`
   <div class="item">
    <div>
     <strong>${esc(w.word)}</strong>
     <span class="muted"> — ${esc(w.translation)}</span>
     ${w.example?`<p class="small muted">${esc(w.example)}</p>`:""}
    </div>
    <button class="danger" data-delete="${w.id}">Видалити</button>
   </div>
  `).join("")||'<p class="muted">Слів поки немає.</p>';

  $$("[data-delete]").forEach(b=>b.onclick=async()=>{
   if(!confirm("Видалити це слово?"))return;
   const {error}=await sb.from("dictionary").delete().eq("id",b.dataset.delete).eq("user_id",user.id);
   if(error){toast(error.message);return}
   data=data.filter(w=>w.id!==b.dataset.delete);
   showWords($("#wordSearch").value);
   toast("Слово видалено");
  });
 }

 showWords();

 $("#wordSearch").oninput=e=>showWords(e.target.value);

 $("#wordForm").onsubmit=async e=>{
  e.preventDefault();
  const f=new FormData(e.target);
  const {data:created,error}=await sb.from("dictionary").insert({
   user_id:user.id,
   word:f.get("word").trim(),
   translation:f.get("translation").trim(),
   example:f.get("example").trim()
  }).select().single();

  if(error){toast(error.message);return}

  data.unshift(created);
  e.target.reset();
  showWords($("#wordSearch").value);
  toast("Слово збережено у словнику!");
 };
}
async function tasksPage(v){
 const data=await rows("tasks",{student_id:user.id});

 v.innerHTML=title("Домашні завдання","Переглядай завдання та відмічай виконані.")+
 `<div class="card">
  <div class="section-head">
   <h2>Мої завдання</h2>
   <span class="pill">${data.length} завдань</span>
  </div>
  <div class="list" id="taskList"></div>
 </div>`;

 function show(){
  $("#taskList").innerHTML=data.map(t=>`
   <div class="item">
    <div>
     <strong>${esc(t.title)}</strong>
     <p class="muted small">${esc(t.subject||"Англійська")}</p>
     ${t.description?`<p>${esc(t.description)}</p>`:""}
     <span class="small muted">Термін: ${t.due_date?esc(t.due_date):"не вказано"}</span>
     <p><span class="pill">${t.status==="checked"?"Перевірено":t.status==="submitted"?"Надіслано":"Очікує виконання"}</span></p>
    </div>
    ${t.status==="pending"||!t.status?`<button data-done="${t.id}">Виконано</button>`:""}
   </div>
  `).join("")||'<p class="muted">Поки немає домашніх завдань.</p>';

  $$("[data-done]").forEach(b=>b.onclick=async()=>{
   const {error}=await sb.from("tasks")
    .update({completed:true,status:"submitted"})
    .eq("id",b.dataset.done)
    .eq("student_id",user.id);

   if(error){toast(error.message);return}

   const task=data.find(x=>x.id===b.dataset.done);
   if(task){task.completed=true;task.status="submitted"}
   show();
   toast("Завдання позначено як виконане!");
  });
 }

 show();
}

function testPage(v){
 let index=0,score=0;
 const questions=exercises;

 function draw(){
  const q=questions[index];

  v.innerHTML=title("Перевір свої знання","Виконай короткий тест з англійської.")+
  `<div class="card">
   <div class="muted small">Питання ${index+1} із ${questions.length}</div>
   <h2>${q.q}</h2>
   <div class="list">
    ${q.a.map((a,i)=>`<button class="secondary" data-answer="${i}">${esc(a)}</button>`).join("")}
   </div>
   <p class="muted">Правильних відповідей: ${score}</p>
  </div>`;

  $$("[data-answer]").forEach(b=>b.onclick=()=>{
   const selected=Number(b.dataset.answer);

   if(selected===q.c){
    score++;
    toast("Правильно! " + q.why);
   }else{
    toast("Спробуй ще раз. " + q.why);
   }

   index++;
   if(index<questions.length)draw();
   else{
    v.innerHTML=title("Тест завершено!","Ось твій результат.")+
    `<div class="card">
     <div class="stat">${score}/${questions.length}</div>
     <p>Ти відповіла правильно на ${score} із ${questions.length} питань.</p>
     <button id="again">Пройти ще раз</button>
    </div>`;
    $("#again").onclick=()=>{index=0;score=0;draw()};
   }
  });
 }

 draw();
}async function schedulePage(v,joinId){
 let data=await rows("lessons",{student_id:user.id});
 if(profile.role==="teacher")data=await rows("lessons",{teacher_id:user.id});

 v.innerHTML=title("Розклад","Твої заняття та онлайн-кімната VAMP.")+
 `<div class="card">
  <div class="section-head">
   <h2>Майбутні уроки</h2>
   <span class="pill">${data.length} занять</span>
  </div>
  <div class="list">
   ${data.sort((a,b)=>new Date(a.lesson_date)-new Date(b.lesson_date)).map(s=>`
    <div class="item">
     <div>
      <strong>${esc(s.title||"Англійська")}</strong>
      <span class="muted small">${fmt(s.lesson_date)} · ${esc(s.status||"scheduled")}</span>
     </div>
     <div class="actions">
      <button data-join="${s.id}">Увійти у відеоурок</button>
      ${profile.role!=="admin"?`<button class="secondary" data-move="${s.id}">Попросити перенесення</button>`:""}
     </div>
    </div>
   `).join("")||'<p class="muted">Уроків поки немає.</p>'}
  </div>
 </div>
 <div id="videoRoom"></div>`;

 $$("[data-join]").forEach(b=>b.onclick=()=>videoRoom(b.dataset.join));

 $$("[data-move]").forEach(b=>b.onclick=async()=>{
  let reason=prompt("Чому потрібно перенести урок?");
  if(reason===null)return;

  let {error}=await sb.from("lesson_requests").insert({
   lesson_id:b.dataset.move,
   requester_id:user.id,
   reason
  });

  toast(error?error.message:"Запит на перенесення надіслано адміністратору");
 });

 if(joinId)videoRoom(joinId);
}

async function videoRoom(id){
 let {data:l}=await sb.from("lessons").select("*").eq("id",id).single();

 if(!l){
  toast("Урок не знайдено");
  return;
 }

 modal(`
  <h2>Відеоурок VAMP</h2>
  <p class="muted">Дозволь доступ до камери й мікрофона. Для з'єднання викладач та учень мають відкрити цю кімнату.</p>
  <div class="video-grid">
   <div>
    <video id="localVideo" autoplay muted playsinline></video>
    <p class="small muted">Ти</p>
   </div>
   <div>
    <video id="remoteVideo" autoplay playsinline></video>
    <p class="small muted">Співрозмовник</p>
   </div>
  </div>
  <div class="actions" style="margin-top:15px">
   <button id="startCall">Увімкнути камеру й приєднатися</button>
   <button class="danger" id="endCall">Завершити</button>
  </div>
  <p class="hint small">Якщо відео не з'єднується через мережу, для стабільної роботи потрібен TURN-сервер.</p>
 `);

 $("#startCall").onclick=()=>startVideo(id);
 $("#endCall").onclick=stopVideo;
}

async function startVideo(id){
 try{
  localStream=await navigator.mediaDevices.getUserMedia({
   video:true,
   audio:true
  });

  $("#localVideo").srcObject=localStream;

  peer=new RTCPeerConnection({
   iceServers:[{urls:"stun:stun.l.google.com:19302"}]
  });

  localStream.getTracks().forEach(t=>peer.addTrack(t,localStream));

  peer.ontrack=e=>$("#remoteVideo").srcObject=e.streams[0];

  const room="vamp-"+id;

  channel=sb.channel(room,{
   config:{broadcast:{self:false}}
  });

  channel.on("broadcast",{event:"signal"},async({payload})=>{
   if(payload.from===user.id)return;

   if(payload.type==="offer"){
    await peer.setRemoteDescription(payload.description);
    let a=await peer.createAnswer();
    await peer.setLocalDescription(a);

    channel.send({
     type:"broadcast",
     event:"signal",
     payload:{
      from:user.id,
      type:"answer",
      description:a
     }
    });
   }else if(payload.type==="answer"){
    await peer.setRemoteDescription(payload.description);
   }else if(payload.type==="candidate"&&payload.candidate){
    try{
     await peer.addIceCandidate(payload.candidate);
    }catch(e){
     console.warn(e);
    }
   }
  }).subscribe(async status=>{
   if(status==="SUBSCRIBED"){
    peer.onicecandidate=e=>{
     if(e.candidate){
      channel.send({
       type:"broadcast",
       event:"signal",
       payload:{
        from:user.id,
        type:"candidate",
        candidate:e.candidate
       }
      });
     }
    };

    if(profile.role==="teacher"){
     let offer=await peer.createOffer();
     await peer.setLocalDescription(offer);

     channel.send({
      type:"broadcast",
      event:"signal",
      payload:{
       from:user.id,
       type:"offer",
       description:offer
      }
     });
    }

    toast("Камера активна. Очікуємо співрозмовника…");
   }
  });
 }catch(e){
  toast("Не вдалося ввімкнути камеру: "+e.message);
 }
}

async function stopVideo(){
 if(localStream)localStream.getTracks().forEach(t=>t.stop());
 if(peer)peer.close();
 if(channel)await sb.removeChannel(channel);

 localStream=peer=channel=null;
 closeModal();
}

async function messagesPage(v){
 let data=await sb.from("messages")
  .select("*")
  .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
  .order("created_at");

 if(data.error)throw data.error;

 v.innerHTML=title("Повідомлення","Спілкуйся з учителем або адміністрацією.")+
 `<div class="card">
  <div class="list" id="chatList">
   ${(data.data||[]).map(m=>`
    <div class="item">
     <div>
      <strong>${m.sender_id===user.id?"Я":esc(m.sender_name||"Повідомлення")}</strong>
      <p>${esc(m.content)}</p>
      <span class="small muted">${fmt(m.created_at)}</span>
     </div>
    </div>
   `).join("")||'<p class="muted">Повідомлень поки немає.</p>'}
  </div>

  <form id="msgForm" class="formgrid" style="margin-top:15px">
   <label>Кому (ID користувача)
    <input name="to" required placeholder="ID учителя або адміністратора">
   </label>
   <label>Повідомлення
    <input name="body" required>
   </label>
   <button class="full">Надіслати</button>
  </form>
 </div>`;

 $("#msgForm").onsubmit=async e=>{
  e.preventDefault();
  let f=new FormData(e.target);

  let {error}=await sb.from("messages").insert({
   sender_id:user.id,
   recipient_id:f.get("to"),
   content:f.get("body")
  });

  if(error)toast(error.message);
  else messagesPage(v);
 };
}
async function profilePage(v){
 v.innerHTML=title("Мій профіль","Особиста інформація та навчальні налаштування.")+
 `<div class="card">
  <form id="profileForm" class="formgrid">
   <label>Повне ім'я
    <input name="full_name" value="${esc(profile.full_name||"")}" required>
   </label>
   <label>Вік
    <input name="age" type="number" min="4" max="100" value="${profile.age??""}">
   </label>
   <label>Номер телефону
    <input name="phone" value="${esc(profile.phone||"")}" placeholder="+380…">
   </label>
   <label>Рівень англійської
    <select name="level">
     ${levels.map(l=>`<option ${profile.level===l?"selected":""}>${l}</option>`).join("")}
    </select>
   </label>
   <label class="full">Email
    <input value="${esc(user.email)}" disabled>
   </label>
   <button class="full">Зберегти профіль</button>
  </form>
 </div>`;

 $("#profileForm").onsubmit=async e=>{
  e.preventDefault();
  let f=new FormData(e.target);
  let patch={
   full_name:f.get("full_name"),
   age:f.get("age")?+f.get("age"):null,
   phone:f.get("phone"),
   level:f.get("level")
  };
  let {error}=await sb.from("profiles").update(patch).eq("id",user.id);
  if(error)toast(error.message);
  else{
   profile={...profile,...patch};
   toast("Профіль оновлено");
  }
 };
}

async function adminPage(v){
 let [users,lessons,requests]=await Promise.all([
  rows("profiles"),
  rows("lessons"),
  rows("lesson_requests")
 ]);

 v.innerHTML=title("Адміністрування","Керування учнями, викладачами, розкладом та запитами.")+
 `<div class="grid">
  <div class="card col-3">
   <span class="muted">Користувачі</span>
   <div class="stat">${users.length}</div>
  </div>
  <div class="card col-3">
   <span class="muted">Учні</span>
   <div class="stat">${users.filter(x=>x.role==="student").length}</div>
  </div>
  <div class="card col-3">
   <span class="muted">Викладачі</span>
   <div class="stat">${users.filter(x=>x.role==="teacher").length}</div>
  </div>
  <div class="card col-3">
   <span class="muted">Уроки</span>
   <div class="stat">${lessons.length}</div>
  </div>

  <div class="card col-6">
   <h2>Створити акаунт</h2>
   <form id="createUser" class="list">
    <label>Ім'я<input name="name" required></label>
    <label>Email<input name="email" type="email" required></label>
    <label>Тимчасовий пароль<input name="password" minlength="8" required></label>
    <label>Роль
     <select name="role">
      <option value="student">Учень</option>
      <option value="teacher">Учитель</option>
      <option value="admin">Адміністратор</option>
     </select>
    </label>
    <label>Вік<input name="age" type="number" min="4" max="100"></label>
    <label>Рівень
     <select name="level">${levels.map(x=>`<option>${x}</option>`).join("")}</select>
    </label>
    <button>Створити акаунт</button>
    <p class="hint small">Потрібна Edge Function create-user.</p>
   </form>
  </div>

  <div class="card col-6">
   <h2>Створити урок</h2>
   <form id="createLesson" class="list">
    <label>Учень
     <select name="student">
      ${users.filter(x=>x.role==="student").map(x=>`<option value="${x.id}">${esc(x.full_name)}</option>`).join("")}
     </select>
    </label>
    <label>Учитель
     <select name="teacher">
      ${users.filter(x=>x.role==="teacher").map(x=>`<option value="${x.id}">${esc(x.full_name)}</option>`).join("")}
     </select>
    </label>
    <label>Назва<input name="title" value="Урок англійської"></label>
    <label>Дата і час<input name="date" type="datetime-local" required></label>
    <button>Додати до розкладу</button>
   </form>
  </div>

  <div class="card col-12">
   <h2>Користувачі</h2>
   <div class="tablewrap">
    <table>
     <tr><th>Ім'я</th><th>Роль</th><th>Вік</th><th>Рівень</th></tr>
     ${users.map(u=>`<tr>
      <td>${esc(u.full_name)}</td>
      <td>${esc(u.role)}</td>
      <td>${u.age??"—"}</td>
      <td>${u.level||"—"}</td>
     </tr>`).join("")}
    </table>
   </div>
  </div>

  <div class="card col-12">
   <h2>Запити на перенесення</h2>
   <div class="list">
    ${requests.map(r=>`<div class="item">
     <span>${esc(r.reason||"Перенесення уроку")} · ${r.status||"очікує"}</span>
     <button data-approve="${r.id}">Позначити опрацьованим</button>
    </div>`).join("")||'<p class="muted">Нових запитів немає.</p>'}
   </div>
  </div>
 </div>`;

 $("#createUser").onsubmit=async e=>{
  e.preventDefault();
  let f=new FormData(e.target);
  try{
   let {data:{session}}=await sb.auth.getSession();
   let res=await fetch(`${SUPABASE_URL}/functions/v1/create-user`,{
    method:"POST",
    headers:{
     Authorization:`Bearer ${session.access_token}`,
     "Content-Type":"application/json",
     apikey:SUPABASE_ANON_KEY
    },
    body:JSON.stringify(Object.fromEntries(f))
   });
   let j=await res.json();
   if(!res.ok)throw Error(j.error||"Не вдалося створити акаунт");
   toast("Акаунт створено");
   adminPage(v);
  }catch(err){
   toast(err.message);
  }
 };

 $("#createLesson").onsubmit=async e=>{
  e.preventDefault();
  let f=new FormData(e.target);
  let {error}=await sb.from("lessons").insert({
   student_id:f.get("student"),
   teacher_id:f.get("teacher"),
   title:f.get("title"),
   lesson_date:f.get("date").slice(0,10)
  });
  if(error)toast(error.message);
  else{
   toast("Урок додано до розкладу");
   adminPage(v);
  }
 };

 $$("[data-approve]").forEach(b=>b.onclick=async()=>{
  let {error}=await sb.from("lesson_requests")
   .update({status:"reviewed"})
   .eq("id",b.dataset.approve);
  toast(error?error.message:"Запит опрацьовано");
  adminPage(v);
 });
}

async function teacherPage(v){
 let students=await sb.from("profiles").select("*").eq("role","student");
 let my=await rows("lessons",{teacher_id:user.id});

 v.innerHTML=title("Кабінет учителя","Твої учні, уроки та домашні завдання.")+
 `<div class="grid">
  <div class="card col-6">
   <h2>Мої учні</h2>
   <div class="list">
    ${(students.data||[]).map(s=>`<div class="item">
     <div>
      <strong>${esc(s.full_name)}</strong>
      <span class="small muted">${s.level||"A1"} · ${s.age??"—"} років</span>
     </div>
     <button class="secondary" data-student="${s.id}">Задати роботу</button>
    </div>`).join("")}
   </div>
  </div>

  <div class="card col-6">
   <h2>Мої уроки</h2>
   <div class="list">
    ${my.map(l=>`<div class="item">
     <div>
      <strong>${esc(l.title)}</strong>
      <span class="small muted">${fmt(l.lesson_date)}</span>
     </div>
     <button data-join="${l.id}">Відкрити</button>
    </div>`).join("")||'<p class="muted">Немає уроків.</p>'}
   </div>
  </div>

  <div class="card col-12">
   <h2>Створити домашнє завдання</h2>
   <form id="newTask" class="formgrid">
    <label>Учень
     <select name="student">
      ${(students.data||[]).map(s=>`<option value="${s.id}">${esc(s.full_name)}</option>`).join("")}
     </select>
    </label>
    <label>Назва<input name="title" required></label>
    <label class="full">Опис<textarea name="description"></textarea></label>
    <label>Дедлайн<input name="due" type="date"></label>
    <button>Призначити</button>
   </form>
  </div>
 </div>`;

 $("#newTask").onsubmit=async e=>{
  e.preventDefault();
  let f=new FormData(e.target);
  let {error}=await sb.from("tasks").insert({
   teacher_id:user.id,
   student_id:f.get("student"),
   title:f.get("title"),
   description:f.get("description"),
   due_date:f.get("due"),
   status:"new"
  });
  toast(error?error.message:"Домашнє завдання призначено");
  teacherPage(v);
 };

 $$("[data-join]").forEach(b=>b.onclick=()=>videoRoom(b.dataset.join));

 $$("[data-student]").forEach(b=>b.onclick=()=>{
  $("#newTask").elements.student.value=b.dataset.student;
  $("#newTask").scrollIntoView({behavior:"smooth"});
 });
}

document.addEventListener("DOMContentLoaded",init);
