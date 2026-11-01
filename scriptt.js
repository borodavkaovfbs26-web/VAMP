
/* =====================================
   VAMP ONLINE SCHOOL
   Main JavaScript
===================================== */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];


/* Безпечне відображення тексту */

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));


/* Форматування дати */

const formatDate = date => {

  if (!date) return "—";

  return new Date(date + "T00:00:00")
    .toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

};


/* Сповіщення */

function showNotice(message, type = "") {

  const box = $("#notice");

  if (!box) {
    alert(message);
    return;
  }

  box.className = "notice " + type;
  box.textContent = message;
  box.hidden = false;

}


/* =====================================
   AUTHENTICATION
===================================== */

async function getSession() {

  const { data, error } =
    await sb.auth.getSession();

  if (error) throw error;

  return data.session;

}


async function getProfile(userId) {

  const { data, error } =
    await sb.from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

  if (error) throw error;

  return data;

}


/* Перевірка авторизації */

async function requireAuth() {

  const session = await getSession();

  if (!session) {

    location.href = "login.html";

    return null;

  }

  try {

    const profile =
      await getProfile(session.user.id);

    return {
      session,
      profile
    };

  } catch (error) {

    console.error(error);

    showNotice(
      "Не вдалося завантажити профіль. Перевір Supabase.",
      "error"
    );

    return null;

  }

}


/* Вихід з акаунта */

async function logout() {

  const { error } =
    await sb.auth.signOut();

  if (error) {

    showNotice(error.message, "error");

  } else {

    location.href = "index.html";

  }

}


/* Аватар */

function initials(name = "VAMP") {

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() || "")
    .join("") || "V";

}


/* =====================================
   SIDEBAR
===================================== */

function renderShell(profile, active = "dashboard") {

  const name =
    profile.full_name || "Учень VAMP";

  const nav = [

    ["dashboard", "⌂", "Головна", "dashboard.html"],

    ["diary", "▤", "Щоденник", "diary.html"],

    ["dictionary", "文", "Мій словник", "dictionary.html"],

    ["tasks", "✓", "Завдання", "tasks.html"],

    ["schedule", "◷", "Розклад", "schedule.html"],

    ["profile", "◉", "Профіль", "profile.html"]

  ];


  const teacherLinks =
    profile.role === "teacher" ||
    profile.role === "admin"

    ? `
      <div class="nav-label">
        Навчання
      </div>

      <nav class="nav">

        <a href="teachers.html"
          class="${active === "teachers" ? "active" : ""}">

          <span class="nav-icon">♧</span>
          Кабінет учителя

        </a>

      </nav>
    `

    : "";


  const adminLinks =
    profile.role === "admin"

    ? `
      <nav class="nav">

        <a href="admin.html"
          class="${active === "admin" ? "active" : ""}">

          <span class="nav-icon">⚙</span>
          Адміністрація

        </a>

      </nav>
    `

    : "";


  $("#app").innerHTML = `

    <div class="app-shell">

      <aside class="sidebar" id="sidebar">

        <a class="brand" href="dashboard.html">

          <span class="brand-mark">V</span>

          <span class="brand-name">VAMP</span>

        </a>


        <div class="nav-label">
          Навчання
        </div>


        <nav class="nav">

          ${nav.map(([key, icon, label, url]) => `

            <a href="${url}"
              class="${active === key ? "active" : ""}">

              <span class="nav-icon">${icon}</span>

              ${label}

            </a>

          `).join("")}

        </nav>


        ${teacherLinks}

        ${adminLinks}


        <div class="sidebar-bottom">

          <div class="user-mini">

            <div class="avatar">

              ${escapeHTML(initials(name))}

            </div>

            <div>

              <strong>
                ${escapeHTML(name)}
              </strong>

              <small>
                ${escapeHTML(profile.role)}
              </small>

            </div>

          </div>


          <button class="btn"
            id="logoutBtn"
            style="width:100%;margin-top:10px">

            ↗ Вийти з акаунта

          </button>

        </div>

      </aside>


      <main class="main">

        <div class="topbar">

          <button class="icon-btn mobile-menu"
            id="menuBtn">

            ☰

          </button>

          <div></div>

          <div class="top-actions">

            <button class="icon-btn" title="VAMP">

              ✦

            </button>

          </div>

        </div>


        <div id="page"></div>

      </main>

    </div>

  `;


  $("#logoutBtn")
    .addEventListener("click", logout);


  $("#menuBtn")?.addEventListener("click", () => {

    $("#sidebar").classList.toggle("open");

  });

}


/* =====================================
   DASHBOARD
===================================== */

async function loadDashboard(profile, userId) {

  const [tasks, grades, words, lessons] =
    await Promise.all([

      sb.from("tasks")
        .select("*")
        .eq("student_id", userId)
        .order("due_date", {
          ascending: true
        })
        .limit(5),


      sb.from("grades")
        .select("*")
        .eq("student_id", userId)
        .order("created_at", {
          ascending: false
        })
        .limit(20),


      sb.from("dictionary")
        .select("id", {
          count: "exact",
          head: true
        })
        .eq("user_id", userId),


      sb.from("schedule")
        .select("*")
        .eq("student_id", userId)
        .order("lesson_date", {
          ascending: true
        })
        .limit(5)

    ]);


  const errors =
    [tasks, grades, words, lessons]
      .filter(result => result.error);


  if (errors.length) {
    throw errors[0].error;
  }


  const gradeList = grades.data || [];

  const average = gradeList.length

    ? (
        gradeList.reduce(
          (sum, grade) => sum + grade.grade,
          0
        ) / gradeList.length
      ).toFixed(1)

    : "—";


  const taskList = tasks.data || [];

  const firstName =
    profile.full_name?.split(" ")[0] || "учню";


  $("#page").innerHTML = `

    <div class="eyebrow">
      ТВІЙ ПРОСТІР НАВЧАННЯ
    </div>

    <h1>
      Привіт, ${escapeHTML(firstName)} ✦
    </h1>

    <p class="subtitle">
      Твій навчальний простір VAMP —
      усе важливе в одному місці.
    </p>


    <section class="card hero-card section-gap">

      <div class="eyebrow">
        VAMP • LEARN YOUR WAY
      </div>

      <h2>
        Твої цілі. Твій ритм.
        <br>
        Твоя історія успіху.
      </h2>

      <p class="subtitle">
        Маленькі кроки щодня створюють великі результати.
      </p>

      <a class="btn btn-primary" href="tasks.html">

        Перейти до завдань →

      </a>

    </section>


    <section class="grid grid-4 section-gap">


      <div class="card">

        <div class="stat-label">
          Середній бал
        </div>

        <div class="stat-value">
          ${average}
        </div>

        <div class="stat-foot">
          ✦ Твоя успішність
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Словник
        </div>

        <div class="stat-value">
          ${words.count || 0}
        </div>

        <div class="stat-foot">
          Слів збережено
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Завдання
        </div>

        <div class="stat-value">
          ${taskList.filter(t => !t.completed).length}
        </div>

        <div class="stat-foot">
          Потрібно виконати
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Уроки
        </div>

        <div class="stat-value">
          ${(lessons.data || []).length}
        </div>

        <div class="stat-foot">
          У найближчому списку
        </div>

      </div>

    </section>


    <section class="grid grid-2 section-gap">


      <div class="card">

        <div class="card-header">

          <h2>Завдання</h2>

          <a class="btn" href="tasks.html">
            Усі →
          </a>

        </div>


        <div class="list">

          ${taskList.length

            ? taskList.map(task => `

              <div class="list-item">

                <div class="stat-icon">

                  ${task.completed ? "✓" : "✎"}

                </div>

                <div class="item-main">

                  <strong>
                    ${escapeHTML(task.title)}
                  </strong>

                  <small>

                    ${escapeHTML(task.subject || "Загальне")}

                    ·

                    ${formatDate(task.due_date)}

                  </small>

                </div>

                <span class="badge ${
                  task.completed ? "badge-green" : ""
                }">

                  ${task.completed ? "Готово" : "В роботі"}

                </span>

              </div>

            `).join("")

            : `
              <div class="empty">
                Поки немає завдань 🎉
              </div>
            `

          }

        </div>

      </div>


      <div class="card">

        <div class="card-header">

          <h2>Останні оцінки</h2>

          <a class="btn" href="diary.html">
            Щоденник →
          </a>

        </div>


        <div class="list">

          ${gradeList.length

            ? gradeList.slice(0, 5).map(grade => `

              <div class="list-item">

                <div class="stat-icon">
                  ✦
                </div>

                <div class="item-main">

                  <strong>
                    ${escapeHTML(grade.subject)}
                  </strong>

                  <small>
                    ${formatDate(
                      grade.created_at?.slice(0, 10)
                    )}
                  </small>

                </div>

                <span class="badge badge-green">

                  ${grade.grade}/12

                </span>

              </div>

            `).join("")

            : `
              <div class="empty">
                Оцінок поки немає
              </div>
            `

          }

        </div>

      </div>

    </section>


    <div class="footer-note">

      VAMP · Освітній простір нового покоління

    </div>

  `;

}


/* =====================================
   DIARY
===================================== */

async function loadDiary(userId) {

  const { data, error } =
    await sb.from("grades")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", {
        ascending: false
      });


  if (error) throw error;


  const grades = data || [];


  const average = grades.length

    ? (
        grades.reduce(
          (sum, grade) => sum + grade.grade,
          0
        ) / grades.length
      ).toFixed(2)

    : "—";


  $("#page").innerHTML = `

    <div class="eyebrow">
      ТВОЇ РЕЗУЛЬТАТИ
    </div>

    <h1>Щоденник</h1>

    <p class="subtitle">
      Тут зберігається історія твоїх оцінок
      та навчальних досягнень.
    </p>


    <section class="grid grid-3 section-gap">


      <div class="card">

        <div class="stat-label">
          Кількість оцінок
        </div>

        <div class="stat-value">
          ${grades.length}
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Середній бал
        </div>

        <div class="stat-value">
          ${average}
        </div>

      </div>


      <div class="card">

        <div class="stat-label">
          Шкала
        </div>

        <div class="stat-value">
          12
        </div>

        <div class="stat-foot">
          Максимальний бал
        </div>

      </div>

    </section>


    <section class="card section-gap">

      <div class="card-header">

        <h2>Журнал оцінок</h2>

        <span class="badge">
          Мій прогрес
        </span>

      </div>


      <div class="table-wrap">

        <table>

          <thead>

            <tr>
              <th>Предмет</th>
              <th>Оцінка</th>
              <th>Коментар учителя</th>
              <th>Дата</th>
            </tr>

          </thead>


          <tbody>

            ${grades.length

              ? grades.map(grade => `

                <tr>

                  <td>
                    <strong>
                      ${escapeHTML(grade.subject)}
                    </strong>
                  </td>

                  <td>

                    <span class="badge badge-green">
                      ${grade.grade}/12
                    </span>

                  </td>

                  <td>
                    ${escapeHTML(grade.comment || "—")}
                  </td>

                  <td>
                    ${formatDate(
                      grade.created_at?.slice(0, 10)
                    )}
                  </td>

                </tr>

              `).join("")

              : `

                <tr>

                  <td colspan="4" class="empty">

                    Оцінки з'являться тут,
                    коли вчитель їх додасть.

                  </td>

                </tr>

              `

            }

          </tbody>

        </table>

      </div>

    </section>

  `;

}


/* =====================================
   DICTIONARY
===================================== */

async function loadDictionary(userId) {

  let words = [];


  async function fetchWords(search = "") {

    let query =
      sb.from("dictionary")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false
        });


    if (search) {

      const safeSearch =
        search.replace(/[,%()]/g, "");

      query = query.or(
        `word.ilike.%${safeSearch}%,translation.ilike.%${safeSearch}%`
      );

    }


    const { data, error } = await query;

    if (error) throw error;

    words = data || [];

    renderWords();

  }


  function renderWords() {

    $("#wordList").innerHTML = words.length

      ? words.map(word => `

        <article class="card word-card">

          <div>

            <div class="word">
              ${escapeHTML(word.word)}
            </div>

            <div class="translation">
              ${escapeHTML(word.translation)}
            </div>

            ${word.example

              ? `
                <div class="example">
                  ${escapeHTML(word.example)}
                </div>
                `

              : ""

            }

          </div>


          <button
            class="icon-btn btn-danger delete-word"
            data-id="${word.id}"
            title="Видалити">

            ✕

          </button>

        </article>

      `).join("")

      : `

        <div class="card empty">

          Слів поки немає.
          Додай перше слово ✨

        </div>

      `;


    $$(".delete-word").forEach(button => {

      button.addEventListener("click", async () => {

        if (!confirm("Видалити це слово?")) {
          return;
        }


        const { error } =
          await sb.from("dictionary")
            .delete()
            .eq("id", button.dataset.id)
            .eq("user_id", userId);


        if (error) {

          showNotice(error.message, "error");

        } else {

          await fetchWords($("#searchWords").value);

        }

      });

    });

  }


  $("#page").innerHTML = `

    <div class="eyebrow">
      ТВІЙ PERSONAL VOCAB
    </div>

    <h1>Мій словник</h1>

    <p class="subtitle">

      Зберігай нові слова, переклади та приклади.
      Вони завжди будуть у твоєму акаунті.

    </p>


    <section class="card section-gap">

      <div class="card-header">

        <h2>Додати нове слово</h2>

        <span class="badge">
          VOCABULARY
        </span>

      </div>


      <form id="wordForm" class="form-grid">


        <div class="form-row">


          <div class="field">

            <label>Слово</label>

            <input
              class="input"
              name="word"
              required
              placeholder="Наприклад, confidence">

          </div>


          <div class="field">

            <label>Переклад</label>

            <input
              class="input"
              name="translation"
              required
              placeholder="Впевненість">

          </div>


        </div>


        <div class="field">

          <label>Приклад (необов'язково)</label>

          <input
            class="input"
            name="example"
            placeholder="I gained confidence...">

        </div>


        <button class="btn btn-primary" type="submit">

          ＋ Зберегти слово

        </button>


      </form>

    </section>


    <div class="toolbar section-gap">

      <input
        class="input"
        id="searchWords"
        placeholder="⌕ Пошук слова або перекладу...">

    </div>


    <section class="grid grid-2" id="wordList"></section>

  `;


  $("#wordForm").addEventListener("submit", async event => {

    event.preventDefault();

    const form =
      new FormData(event.currentTarget);


    const { error } =
      await sb.from("dictionary").insert({

        user_id: userId,

        word: form.get("word").trim(),

        translation:
          form.get("translation").trim(),

        example:
          form.get("example").trim()

      });


    if (error) {

      showNotice(error.message, "error");

    } else {

      event.currentTarget.reset();

      showNotice(
        "Слово додано до словника!",
        "success"
      );

      await fetchWords(
        $("#searchWords").value
      );

    }

  });


  $("#searchWords").addEventListener("input", event => {

    fetchWords(event.target.value.trim());

  });


  await fetchWords();

}


/* =====================================
   TASKS
===================================== */

async function loadTasks(userId) {

  const { data, error } =
    await sb.from("tasks")
      .select("*")
      .eq("student_id", userId)
      .order("due_date", {
        ascending: true
      });


  if (error) throw error;


  const tasks = data || [];


  $("#page").innerHTML = `

    <div class="eyebrow">
      ТВОЯ НАВЧАЛЬНА ЦІЛЬ
    </div>

    <h1>Домашні завдання</h1>

    <p class="subtitle">

      Відстежуй дедлайни
      та позначай виконану роботу.

    </p>


    <section class="card section-gap">

      <div class="card-header">

        <h2>Мої завдання</h2>

        <span class="badge">

          ${tasks.filter(task => !task.completed).length}
          активних

        </span>

      </div>


      <div class="list">


        ${tasks.length

          ? tasks.map(task => `

            <div class="list-item">

              <input
                type="checkbox"
                class="task-check"
                data-id="${task.id}"
                ${task.completed ? "checked" : ""}
                aria-label="Виконано">


              <div class="item-main">

                <strong>
                  ${escapeHTML(task.title)}
                </strong>

                <small>

                  ${escapeHTML(task.subject || "Загальне")}

                  ·

                  дедлайн:
                  ${formatDate(task.due_date)}

                </small>


                ${task.description

                  ? `
                    <div class="example">
                      ${escapeHTML(task.description)}
                    </div>
                    `

                  : ""

                }

              </div>


              <span class="badge ${
                task.completed
                  ? "badge-green"
                  : "badge-pink"
              }">

                ${task.completed
                  ? "Виконано"
                  : "Очікує"
                }

              </span>

            </div>

          `).join("")

          : `

            <div class="empty">

              Завдань поки немає.
              Чекай на нові! 🌙

            </div>

          `

        }


      </div>

    </section>

  `;


  $$(".task-check").forEach(checkbox => {

    checkbox.addEventListener("change", async () => {

      const { error } =
        await sb.from("tasks")
          .update({
            completed: checkbox.checked
          })
          .eq("id", checkbox.dataset.id)
          .eq("student_id", userId);


      if (error) {

        showNotice(error.message, "error");

        checkbox.checked = !checkbox.checked;

      } else {

        await loadTasks(userId);

      }

    });

  });

}


/* =====================================
   SCHEDULE
===================================== */

async function loadSchedule(userId) {

  const { data, error } =
    await sb.from("schedule")
      .select("*")
      .eq("student_id", userId)
      .order("lesson_date", {
        ascending: true
      })
      .order("start_time", {
        ascending: true
      });


  if (error) throw error;


  const lessons = data || [];


  $("#page").innerHTML = `

    <div class="eyebrow">
      ПЛАНУЙ СВІЙ ЧАС
    </div>

    <h1>Розклад уроків</h1>

    <p class="subtitle">

      Твій навчальний тиждень —
      організовано та без стресу.

    </p>


    <section class="card section-gap">

      <div class="card-header">

        <h2>Майбутні заняття</h2>

        <span class="badge">
          ${lessons.length} уроків
        </span>

      </div>


      <div class="list">


        ${lessons.length

          ? lessons.map(lesson => `

            <div class="list-item">

              <div class="stat-icon">
                ◷
              </div>


              <div class="item-main">

                <strong>
                  ${escapeHTML(lesson.subject)}
                </strong>

                <small>

                  ${formatDate(lesson.lesson_date)}

                  ·

                  ${String(lesson.start_time).slice(0,5)}

                  –

                  ${String(lesson.end_time).slice(0,5)}

                  ${lesson.room
                    ? " · " + escapeHTML(lesson.room)
                    : ""
                  }

                </small>

              </div>


              <span class="badge">

                ${new Date(
                  lesson.lesson_date + "T00:00:00"
                ).toLocaleDateString("uk-UA", {
                  weekday: "short"
                })}

              </span>

            </div>

          `).join("")

          : `

            <div class="empty">

              Розклад поки не додано.
              Він з'явиться тут після призначення занять.

            </div>

          `

        }


      </div>

    </section>

  `;

}


/* =====================================
   PROFILE
===================================== */

async function loadProfile(profile, session) {

  $("#page").innerHTML = `

    <div class="eyebrow">
      ТВОЇ НАЛАШТУВАННЯ
    </div>

    <h1>Мій профіль</h1>

    <p class="subtitle">

      Керуй інформацією свого акаунта VAMP.

    </p>


    <section class="card section-gap">

      <form id="profileForm" class="form-grid">


        <div class="field">

          <label>Ім'я та прізвище</label>

          <input
            class="input"
            name="full_name"
            required
            value="${escapeHTML(profile.full_name || "")}">

        </div>


        <div class="field">

          <label>
            Email (не можна змінити тут)
          </label>

          <input
            class="input"
            disabled
            value="${escapeHTML(session.user.email || "")}">

        </div>


        <div class="field">

          <label>Роль</label>

          <input
            class="input"
            disabled
            value="${escapeHTML(profile.role)}">

        </div>


        <button class="btn btn-primary">

          Зберегти зміни

        </button>


      </form>


      <div id="notice" hidden></div>

    </section>

  `;


  $("#profileForm").addEventListener("submit", async event => {

    event.preventDefault();


    const form =
      new FormData(event.currentTarget);


    const name =
      form.get("full_name").trim();


    const { error } =
      await sb.from("profiles")
        .update({
          full_name: name
        })
        .eq("id", session.user.id);


    if (error) {

      showNotice(error.message, "error");

    } else {

      showNotice(
        "Профіль оновлено!",
        "success"
      );

    }

  });

}


/* =====================================
   TEACHER SPACE
===================================== */

async function loadTeacher(profile, userId) {

  $("#page").innerHTML = `

    <div class="eyebrow">
      TEACHER SPACE
    </div>

    <h1>Кабінет учителя</h1>

    <p class="subtitle">

      Робочий простір для педагогів VAMP.

    </p>


    <div class="notice">

      Цей розділ доступний за роллю.

      Для керування учнями, виставлення оцінок
      та створення завдань необхідно налаштувати
      таблицю зв'язків учитель–учень і захищені
      RLS-політики.

      Це захищає дані учнів від стороннього доступу.

    </div>


    <section class="grid grid-2 section-gap">


      <div class="card">

        <div class="stat-label">
          МОЖЛИВОСТІ
        </div>

        <h2 style="margin-top:15px">
          Учні та групи
        </h2>

        <p class="subtitle">

          Перегляд закріплених учнів,
          груп, предметів і розкладу.

        </p>

      </div>


      <div class="card">

        <div class="stat-label">
          МОЖЛИВОСТІ
        </div>

        <h2 style="margin-top:15px">
          Оцінювання
        </h2>

        <p class="subtitle">

          Безпечне додавання оцінок,
          коментарів і домашніх завдань.

        </p>

      </div>


    </section>

  `;

}


/* =====================================
   ADMIN
===================================== */

async function loadAdmin(profile) {

  $("#page").innerHTML = `

    <div class="eyebrow">
      VAMP CONTROL
    </div>

    <h1>Адміністрація</h1>

    <p class="subtitle">
      Панель керування платформою.
    </p>


    <div class="notice">

      Адмін-панель поки є заглушкою.

      Не додавай публічне редагування ролей
      через браузер.

      Роль адміністратора має призначатися
      лише через захищений сервер
      або Supabase Dashboard.

    </div>


    <section class="card section-gap">

      <h2>Керування платформою</h2>

      <p class="subtitle">

        Наступний етап: керування користувачами,
        курсами, групами та зв'язками учнів
        з учителями через серверні функції.

      </p>

    </section>

  `;

}


/* =====================================
   INITIALIZATION
===================================== */

async function initPage(pageName) {

  if (!sb || !sb.auth) {

    console.error("Supabase client is missing");

    return;

  }


  const auth = await requireAuth();


  if (!auth) return;


  renderShell(auth.profile, pageName);


  try {


    const loaders = {

      dashboard: () =>
        loadDashboard(
          auth.profile,
          auth.session.user.id
        ),

      diary: () =>
        loadDiary(
          auth.session.user.id
        ),

      dictionary: () =>
        loadDictionary(
          auth.session.user.id
        ),

      tasks: () =>
        loadTasks(
          auth.session.user.id
        ),

      schedule: () =>
        loadSchedule(
          auth.session.user.id
        ),

      profile: () =>
        loadProfile(
          auth.profile,
          auth.session
        ),

      teachers: () =>
        loadTeacher(
          auth.profile,
          auth.session.user.id
        ),

      admin: () =>
        loadAdmin(
          auth.profile
        )

    };


    /* Перевірка прав */

    if (
      pageName === "teachers" &&
      !["teacher", "admin"].includes(
        auth.profile.role
      )
    ) {

      $("#page").innerHTML = `

        <section class="card">

          <h2>Доступ обмежено</h2>

          <p class="subtitle">

            У твоєї ролі немає доступу до цієї сторінки.

          </p>

          <a class="btn btn-primary"
            href="dashboard.html">

            На головну

          </a>

        </section>

      `;

      return;

    }


    if (
      pageName === "admin" &&
      auth.profile.role !== "admin"
    ) {

      $("#page").innerHTML = `

        <section class="card">

          <h2>Доступ обмежено</h2>

          <p class="subtitle">

            Ця сторінка доступна тільки адміністрації.

          </p>

          <a class="btn btn-primary"
            href="dashboard.html">

            На головну

          </a>

        </section>

      `;

      return;

    }


    await (
      loaders[pageName] ||
      loaders.dashboard
    )();


  } catch (error) {

    console.error(error);


    $("#page").innerHTML = `

      <div class="card">

        <h2>
          Не вдалося завантажити дані
        </h2>

        <p class="subtitle">

          ${escapeHTML(
            error.message ||
            "Перевір з'єднання та таблиці Supabase."
          )}

        </p>

        <button class="btn"
          onclick="location.reload()">

          Спробувати ще

        </button>

      </div>

    `;

  }

}
