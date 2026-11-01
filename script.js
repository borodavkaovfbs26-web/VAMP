
/* ==========================================
   VAMP ONLINE SCHOOL
   Main JavaScript
========================================== */

const sb = window.vampSupabase;

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];


/* ==========================================
   HELPERS
========================================== */

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

function formatDate(date) {
  if (!date) return "—";

  return new Date(date + "T00:00:00").toLocaleDateString(
    "uk-UA",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function showNotice(message, type = "") {
  let notice = $("#notice");

  if (!notice) {
    notice = document.createElement("div");
    notice.id = "notice";
    document.body.appendChild(notice);
  }

  notice.className = "notice " + type;
  notice.textContent = message;
  notice.hidden = false;

  setTimeout(() => {
    notice.hidden = true;
  }, 4000);
}

function initials(name = "VAMP") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() || "")
    .join("") || "V";
}


/* ==========================================
   AUTHENTICATION
========================================== */

async function getSession() {
  const { data, error } = await sb.auth.getSession();

  if (error) throw error;

  return data.session;
}

async function getProfile(userId) {
  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data;
}

async function requireAuth() {
  const session = await getSession();

  if (!session) {
    location.href = "login.html";
    return null;
  }

  try {
    const profile = await getProfile(session.user.id);

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

async function logout() {
  const { error } = await sb.auth.signOut();

  if (error) {
    showNotice(error.message, "error");
  } else {
    location.href = "index.html";
  }
}


/* ==========================================
   SIDEBAR / LAYOUT
========================================== */

function renderShell(profile, active = "dashboard") {
  const name = profile.full_name || "Учень VAMP";

  const nav = [
    ["dashboard", "⌂", "Головна", "dashboard.html"],
    ["diary", "▤", "Щоденник", "diary.html"],
    ["dictionary", "文", "Мій словник", "dictionary.html"],
    ["tasks", "✓", "Завдання", "tasks.html"],
    ["schedule", "◷", "Розклад", "schedule.html"],
    ["profile", "◉", "Профіль", "profile.html"]
  ];

  const teacherLinks =
    ["teacher", "admin"].includes(profile.role)
      ? `
        <div class="nav-label">Навчання</div>
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

        <div class="nav-label">МІЙ ПРОСТІР</div>

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
              <strong>${escapeHTML(name)}</strong>
              <small>${escapeHTML(profile.role || "student")}</small>
            </div>
          </div>

          <button class="btn logout-btn" id="logoutBtn">
            ↗ Вийти з акаунта
          </button>

        </div>
      </aside>

      <main class="main">

        <header class="topbar">
          <button class="icon-btn mobile-menu" id="menuBtn">
            ☰
          </button>

          <div class="topbar-title">VAMP ONLINE SCHOOL</div>

          <div class="top-actions">
            <span class="top-decoration">✦</span>
          </div>
        </header>

        <div class="page-content">
          <div id="page"></div>
        </div>

      </main>
    </div>
  `;

  $("#logoutBtn").addEventListener("click", logout);

  $("#menuBtn")?.addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });
}


/* ==========================================
   DASHBOARD
========================================== */

async function loadDashboard(profile, userId) {
  const [tasks, grades, words, lessons] = await Promise.all([
    sb.from("tasks")
      .select("*")
      .eq("student_id", userId)
      .order("due_date", { ascending: true })
      .limit(5),

    sb.from("grades")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false }),

    sb.from("dictionary")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),

    sb.from("schedule")
      .select("*")
      .eq("student_id", userId)
      .order("lesson_date", { ascending: true })
      .limit(5)
  ]);

  for (const result of [tasks, grades, words, lessons]) {
    if (result.error) throw result.error;
  }

  const taskList = tasks.data || [];
  const gradeList = grades.data || [];
  const lessonList = lessons.data || [];

  const average = gradeList.length
    ? (
        gradeList.reduce((sum, item) => sum + Number(item.grade), 0)
        / gradeList.length
      ).toFixed(1)
    : "—";

  const firstName =
    profile.full_name?.split(" ")[0] || "учню";

  $("#page").innerHTML = `
    <div class="eyebrow">ТВІЙ ПРОСТІР НАВЧАННЯ</div>

    <h1>Привіт, ${escapeHTML(firstName)} ✦</h1>

    <p class="subtitle">
      Твій навчальний простір VAMP — усе важливе в одному місці.
    </p>

    <section class="card hero-card section-gap">
      <div class="eyebrow">VAMP • LEARN YOUR WAY</div>

      <h2>
        Твої цілі. Твій ритм.<br>
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
        <div class="stat-label">Середній бал</div>
        <div class="stat-value">${average}</div>
        <div class="stat-foot">✦ Твоя успішність</div>
      </div>

      <div class="card">
        <div class="stat-label">Словник</div>
        <div class="stat-value">${words.count || 0}</div>
        <div class="stat-foot">Слів збережено</div>
      </div>

      <div class="card">
        <div class="stat-label">Завдання</div>
        <div class="stat-value">
          ${taskList.filter(item => !item.completed).length}
        </div>
        <div class="stat-foot">Потрібно виконати</div>
      </div>

      <div class="card">
        <div class="stat-label">Уроки</div>
        <div class="stat-value">${lessonList.length}</div>
        <div class="stat-foot">Найближчі заняття</div>
      </div>

    </section>

    <section class="grid grid-2 section-gap">

      <div class="card">
        <div class="card-header">
          <h2>Завдання</h2>
          <a class="btn" href="tasks.html">Усі →</a>
        </div>

        <div class="list">
          ${taskList.length
            ? taskList.map(task => `
              <div class="list-item">
                <div class="stat-icon">
                  ${task.completed ? "✓" : "✎"}
                </div>

                <div class="item-main">
                  <strong>${escapeHTML(task.title)}</strong>
                  <small>
                    ${escapeHTML(task.subject || "Загальне")}
                    · ${formatDate(task.due_date)}
                  </small>
                </div>

                <span class="badge">
                  ${task.completed ? "Готово" : "В роботі"}
                </span>
              </div>
            `).join("")
            : `<div class="empty">Поки немає завдань 🎉</div>`
          }
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>Останні оцінки</h2>
          <a class="btn" href="diary.html">Усі →</a>
        </div>

        <div class="list">
          ${gradeList.length
            ? gradeList.slice(0, 5).map(grade => `
              <div class="list-item">
                <div class="stat-icon">✦</div>

                <div class="item-main">
                  <strong>${escapeHTML(grade.subject)}</strong>
                  <small>
                    ${formatDate(grade.created_at?.slice(0, 10))}
                  </small>
                </div>

                <span class="badge badge-green">
                  ${grade.grade}/12
                </span>
              </div>
            `).join("")
            : `<div class="empty">Оцінок поки немає</div>`
          }
        </div>
      </div>

    </section>

    <div class="footer-note">
      VAMP · Освітній простір нового покоління
    </div>
  `;
}


/* ==========================================
   DIARY
========================================== */

async function loadDiary(userId) {
  const { data, error } = await sb
    .from("grades")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const grades = data || [];

  const average = grades.length
    ? (
        grades.reduce((sum, item) => sum + Number(item.grade), 0)
        / grades.length
      ).toFixed(2)
    : "—";

  $("#page").innerHTML = `
    <div class="eyebrow">ТВОЇ РЕЗУЛЬТАТИ</div>
    <h1>Щоденник</h1>

    <p class="subtitle">
      Тут зберігається історія твоїх оцінок та досягнень.
    </p>

    <section class="grid grid-3 section-gap">

      <div class="card">
        <div class="stat-label">Кількість оцінок</div>
        <div class="stat-value">${grades.length}</div>
      </div>

      <div class="card">
        <div class="stat-label">Середній бал</div>
        <div class="stat-value">${average}</div>
      </div>

      <div class="card">
        <div class="stat-label">Шкала</div>
        <div class="stat-value">12</div>
        <div class="stat-foot">Максимальний бал</div>
      </div>

    </section>

    <section class="card section-gap">

      <div class="card-header">
        <h2>Журнал оцінок</h2>
        <span class="badge">Мій прогрес</span>
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
                  <td><strong>${escapeHTML(grade.subject)}</strong></td>
                  <td>
                    <span class="badge badge-green">
                      ${grade.grade}/12
                    </span>
                  </td>
                  <td>${escapeHTML(grade.comment || "—")}</td>
                  <td>
                    ${formatDate(grade.created_at?.slice(0, 10))}
                  </td>
                </tr>
              `).join("")
              : `
                <tr>
                  <td colspan="4" class="empty">
                    Оцінки з'являться тут, коли вчитель їх додасть.
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


/* ==========================================
   DICTIONARY
========================================== */

async function loadDictionary(userId) {
  let words = [];

  $("#page").innerHTML = `
    <div class="eyebrow">YOUR PERSONAL VOCABULARY</div>
    <h1>Мій словник</h1>

    <p class="subtitle">
      Зберігай нові слова, переклади та приклади.
    </p>

    <section class="card section-gap">

      <div class="card-header">
        <h2>Додати нове слово</h2>
        <span class="badge">VOCABULARY</span>
      </div>

      <form id="wordForm" class="form-grid">

        <div class="form-row">

          <div class="field">
            <label>Слово</label>
            <input class="input" name="word"
              required placeholder="Наприклад, confidence">
          </div>

          <div class="field">
            <label>Переклад</label>
            <input class="input" name="translation"
              required placeholder="Впевненість">
          </div>

        </div>

        <div class="field">
          <label>Приклад (необов'язково)</label>
          <input class="input" name="example"
            placeholder="I gained confidence.">
        </div>

        <button class="btn btn-primary" type="submit">
          ＋ Зберегти слово
        </button>

      </form>
    </section>

    <div class="toolbar section-gap">
      <input class="input" id="searchWords"
        placeholder="⌕ Пошук слова або перекладу...">
    </div>

    <section class="grid grid-2" id="wordList"></section>
  `;

  async function fetchWords(search = "") {
    let query = sb
      .from("dictionary")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (search) {
      const safeSearch = search.replace(/[,%()]/g, "");

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
            <div class="word">${escapeHTML(word.word)}</div>
            <div class="translation">
              ${escapeHTML(word.translation)}
            </div>

            ${word.example
              ? `<div class="example">${escapeHTML(word.example)}</div>`
              : ""
            }
          </div>

          <button class="icon-btn btn-danger delete-word"
            data-id="${word.id}" title="Видалити">
            ✕
          </button>

        </article>
      `).join("")
      : `
        <div class="card empty">
          Слів поки немає. Додай перше слово ✨
        </div>
      `;

    $$(".delete-word").forEach(button => {
      button.addEventListener("click", async () => {
        if (!confirm("Видалити це слово?")) return;

        const { error } = await sb
          .from("dictionary")
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

  $("#wordForm").addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const { error } = await sb
      .from("dictionary")
      .insert({
        user_id: userId,
        word: form.get("word").trim(),
        translation: form.get("translation").trim(),
        example: form.get("example").trim()
      });

    if (error) {
      showNotice(error.message, "error");
    } else {
      event.currentTarget.reset();

      showNotice("Слово додано до словника!", "success");

      await fetchWords($("#searchWords").value);
    }
  });

  $("#searchWords").addEventListener("input", event => {
    fetchWords(event.target.value.trim());
  });

  await fetchWords();
}


/* ==========================================
   TASKS
========================================== */

async function loadTasks(userId) {
  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .eq("student_id", userId)
    .order("due_date", { ascending: true });

  if (error) throw error;

  const tasks = data || [];

  $("#page").innerHTML = `
    <div class="eyebrow">ТВОЯ НАВЧАЛЬНА ЦІЛЬ</div>
    <h1>Домашні завдання</h1>

    <p class="subtitle">
      Відстежуй дедлайни та позначай виконану роботу.
    </p>

    <section class="card section-gap">

      <div class="card-header">
        <h2>Мої завдання</h2>
        <span class="badge">
          ${tasks.filter(task => !task.completed).length} активних
        </span>
      </div>

      <div class="list">

        ${tasks.length
          ? tasks.map(task => `
            <div class="list-item">

              <input type="checkbox"
                class="task-check"
                data-id="${task.id}"
                ${task.completed ? "checked" : ""}
                aria-label="Виконано">

              <div class="item-main">
                <strong>${escapeHTML(task.title)}</strong>

                <small>
                  ${escapeHTML(task.subject || "Загальне")}
                  · дедлайн: ${formatDate(task.due_date)}
                </small>

                ${task.description
                  ? `<div class="example">${escapeHTML(task.description)}</div>`
                  : ""
                }
              </div>

              <span class="badge ${
                task.completed ? "badge-green" : "badge-pink"
              }">
                ${task.completed ? "Виконано" : "Очікує"}
              </span>

            </div>
          `).join("")
          : `
            <div class="empty">
              Завдань поки немає. Чекай на нові! 🌙
            </div>
          `
        }

      </div>
    </section>
  `;

  $$(".task-check").forEach(checkbox => {
    checkbox.addEventListener("change", async () => {
      const { error } = await sb
        .from("tasks")
        .update({ completed: checkbox.checked })
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


/* ==========================================
   SCHEDULE
========================================== */

async function loadSchedule(userId) {
  const { data, error } = await sb
    .from("schedule")
    .select("*")
    .eq("student_id", userId)
    .order("lesson_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;

  const lessons = data || [];

  $("#page").innerHTML = `
    <div class="eyebrow">ПЛАНУЙ СВІЙ ЧАС</div>
    <h1>Розклад уроків</h1>

    <p class="subtitle">
      Твій навчальний тиждень — організовано та без стресу.
    </p>

    <section class="card section-gap">

      <div class="card-header">
        <h2>Майбутні заняття</h2>
        <span class="badge">${lessons.length} уроків</span>
      </div>

      <div class="list">

        ${lessons.length
          ? lessons.map(lesson => `
            <div class="list-item">

              <div class="stat-icon">◷</div>

              <div class="item-main">
                <strong>${escapeHTML(lesson.subject)}</strong>

                <small>
                  ${formatDate(lesson.lesson_date)}
                  · ${String(lesson.start_time).slice(0, 5)}
                  – ${String(lesson.end_time).slice(0, 5)}
                  ${lesson.room ? " · " + escapeHTML(lesson.room) : ""}
                </small>
              </div>

              <span class="badge">
                ${new Date(lesson.lesson_date + "T00:00:00")
                  .toLocaleDateString("uk-UA", { weekday: "short" })}
              </span>

            </div>
          `).join("")
          : `
            <div class="empty">
              Розклад поки не додано.
            </div>
          `
        }

      </div>
    </section>
  `;
}


/* ==========================================
   PROFILE
========================================== */

async function loadProfile(profile, session) {
  $("#page").innerHTML = `
    <div class="eyebrow">ТВОЇ НАЛАШТУВАННЯ</div>
    <h1>Мій профіль</h1>

    <p class="subtitle">
      Керуй інформацією свого акаунта VAMP.
    </p>

    <section class="card section-gap">

      <form id="profileForm" class="form-grid">

        <div class="field">
          <label>Ім'я та прізвище</label>
          <input class="input" name="full_name"
            required value="${escapeHTML(profile.full_name || "")}">
        </div>

        <div class="field">
          <label>Email</label>
          <input class="input" disabled
            value="${escapeHTML(session.user.email || "")}">
        </div>

        <div class="field">
          <label>Роль</label>
          <input class="input" disabled
            value="${escapeHTML(profile.role || "student")}">
        </div>

        <button class="btn btn-primary" type="submit">
          Зберегти зміни
        </button>

      </form>
    </section>
  `;

  $("#profileForm").addEventListener("submit", async event => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const name = form.get("full_name").trim();

    const { error } = await sb
      .from("profiles")
      .update({ full_name: name })
      .eq("id", session.user.id);

    if (error) {
      showNotice(error.message, "error");
    } else {
      showNotice("Профіль оновлено!", "success");
    }
  });
}


/* ==========================================
   TEACHER SPACE
========================================== */

async function loadTeacher() {
  $("#page").innerHTML = `
    <div class="eyebrow">TEACHER SPACE</div>
    <h1>Кабінет учителя</h1>

    <p class="subtitle">
      Робочий простір для педагогів VAMP.
    </p>

    <section class="grid grid-2 section-gap">

      <div class="card">
        <div class="stat-label">МОЖЛИВОСТІ</div>
        <h2>Учні та групи</h2>
        <p class="subtitle">
          Перегляд закріплених учнів, груп і предметів.
        </p>
      </div>

      <div class="card">
        <div class="stat-label">МОЖЛИВОСТІ</div>
        <h2>Оцінювання</h2>
        <p class="subtitle">
          Додавання оцінок, коментарів і домашніх завдань.
        </p>
      </div>

    </section>

    <div class="notice">
      Для повноцінного керування учнями потрібно налаштувати
      захищені таблиці та зв'язки в Supabase.
    </div>
  `;
}


/* ==========================================
   ADMIN
========================================== */

async function loadAdmin() {
  $("#page").innerHTML = `
    <div class="eyebrow">VAMP CONTROL</div>
    <h1>Адміністрація</h1>

    <p class="subtitle">
      Панель керування платформою.
    </p>

    <section class="card section-gap">
      <h2>Керування платформою</h2>

      <p class="subtitle">
        Тут буде розміщено керування користувачами,
        курсами, групами та вчителями.
      </p>
    </section>

    <div class="notice">
      Призначення ролей виконується через захищену
      систему Supabase, а не через браузер.
    </div>
  `;
}


/* ==========================================
   INITIALIZATION
========================================== */

async function initPage(pageName) {
  if (!sb || !sb.auth) {
    console.error("Supabase client is missing");
    return;
  }

  try {
    const auth = await requireAuth();

    if (!auth) return;

    renderShell(auth.profile, pageName);

    const userId = auth.session.user.id;

    const loaders = {
      dashboard: () => loadDashboard(auth.profile, userId),
      diary: () => loadDiary(userId),
      dictionary: () => loadDictionary(userId),
      tasks: () => loadTasks(userId),
      schedule: () => loadSchedule(userId),
      profile: () => loadProfile(auth.profile, auth.session),
      teachers: () => loadTeacher(auth.profile),
      admin: () => loadAdmin(auth.profile)
    };

    if (
      pageName === "teachers" &&
      !["teacher", "admin"].includes(auth.profile.role)
    ) {
      $("#page").innerHTML = `
        <section class="card">
          <h2>Доступ обмежено</h2>
          <p class="subtitle">
            У твоєї ролі немає доступу до цієї сторінки.
          </p>
          <a class="btn btn-primary" href="dashboard.html">
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
          <a class="btn btn-primary" href="dashboard.html">
            На головну
          </a>
        </section>
      `;
      return;
    }

    await (loaders[pageName] || loaders.dashboard)();

  } catch (error) {
    console.error(error);

    $("#page").innerHTML = `
      <div class="card">
        <h2>Не вдалося завантажити дані</h2>
        <p class="subtitle">
          ${escapeHTML(error.message || "Перевір з'єднання із Supabase.")}
        </p>
        <button class="btn" onclick="location.reload()">
          Спробувати ще
        </button>
      </div>
    `;
  }
}
