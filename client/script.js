/**
 * ============================================
 * GFPI-F-135 V04 - CRUD Vanilla JS + fetch()
 * ============================================
 */

const API_BASE_URL = 'http://10.5.225.213:3005/todos';

// ===========================================
// 1) SELECCIÓN DE ELEMENTOS DOM
// ===========================================

const messageForm         = document.getElementById('messageForm');
const userNameInput       = document.getElementById('userName');
const userMessageInput    = document.getElementById('userMessage');
const taskDescriptionInput= document.getElementById('taskDescription');
const submitBtnText       = document.getElementById('submitBtnText');
const userNameError       = document.getElementById('userNameError');
const userMessageError    = document.getElementById('userMessageError');
const taskDescriptionError= document.getElementById('taskDescriptionError');
const messagesContainer   = document.getElementById('messagesContainer');
const emptyState          = document.getElementById('emptyState');
const messageCount        = document.getElementById('messageCount');
const formTitle           = document.getElementById('formTitle');

// ===========================================
// 2) ESTADO
// ===========================================

let editingId = null;
let lastRenderedTodos = [];

// ===========================================
// 3) VALIDACIONES / UTILIDADES
// ===========================================

function isValidInput(value) {
  return String(value ?? '').trim().length > 0;
}

function showError(errorElement, message) {
  if (!errorElement) return;
  errorElement.textContent = message;
}

function clearError(errorElement) {
  if (!errorElement) return;
  errorElement.textContent = '';
}

function validateForm() {
  const userName    = userNameInput.value;
  const title       = userMessageInput.value;
  const description = taskDescriptionInput.value;
  let isValid = true;

  if (!isValidInput(userName)) {
    showError(userNameError, 'El nombre de usuario es obligatorio.');
    userNameInput.classList.add('error');
    isValid = false;
  } else {
    clearError(userNameError);
    userNameInput.classList.remove('error');
  }

  if (!isValidInput(title)) {
    showError(userMessageError, 'La tarea no puede estar vacía.');
    userMessageInput.classList.add('error');
    isValid = false;
  } else {
    clearError(userMessageError);
    userMessageInput.classList.remove('error');
  }

  if (!isValidInput(description)) {
    showError(taskDescriptionError, 'La descripción es obligatoria.');
    taskDescriptionInput.classList.add('error');
    isValid = false;
  } else {
    clearError(taskDescriptionError);
    taskDescriptionInput.classList.remove('error');
  }

  return isValid;
}

function resetForm() {
  messageForm.reset();
  clearError(userNameError);
  clearError(userMessageError);
  clearError(taskDescriptionError);
  userNameInput.classList.remove('error');
  userMessageInput.classList.remove('error');
  taskDescriptionInput.classList.remove('error');
}

function getCurrentTimestamp() {
  const now = new Date();
  return now.toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function getInitials(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return '??';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function updateMessageCount(total) {
  messageCount.textContent = total === 1 ? `${total} tarea` : `${total} tareas`;
}

function hideEmptyState() { emptyState.classList.add('hidden'); }
function showEmptyState()  { emptyState.classList.remove('hidden'); }

function setMode(isEditing) {
  editingId = isEditing ? editingId : null;
  if (formTitle)     formTitle.textContent     = isEditing ? 'Editar tarea'     : 'Nueva Tarea';
  if (submitBtnText) submitBtnText.textContent = isEditing ? 'Actualizar tarea' : 'Guardar tarea';
  if (!isEditing) resetForm();
}

// ============================================
// 4) FETCH CRUD (JSON SERVER)
// ============================================

async function apiFetch(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }
  return res;
}

async function loadTodos() {
  const res  = await apiFetch(API_BASE_URL, { method: 'GET' });
  const data = await res.json();
  console.log('✅ Respuesta GET /todos:', data);
  renderTodos(data);
}

async function createTodo({ title, userName, description }) {
  await apiFetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, userName, description })
  });
  await loadTodos();
  showToast('Tarea creada exitosamente.', 'success');
}

async function updateTodo(id, { title, userName, description }) {
  await apiFetch(`${API_BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, userName, description })
  });
  await loadTodos();
  showToast('Tarea actualizada correctamente.', 'success');
}

async function deleteTodo(id) {
  await apiFetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
  await loadTodos();
  showToast('Tarea eliminada.', 'success');
}

// ===========================================
// 4.2) TOAST
// ===========================================

function showToast(message, type = 'success') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast--hidden');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===========================================
// 5) DOM: JSON -> HTML
// ===========================================

function renderTodos(todos) {
  messagesContainer.innerHTML = '';
  lastRenderedTodos = Array.isArray(todos) ? todos : [];

  if (!lastRenderedTodos.length) {
    updateMessageCount(0);
    showEmptyState();
    return;
  }

  hideEmptyState();
  updateMessageCount(lastRenderedTodos.length);

  const fragment = document.createDocumentFragment();

  lastRenderedTodos.forEach(todo => {
    const card = document.createElement('div');
    card.className = 'message-card';

    const initials    = getInitials(todo.userName || 'Usuario');
    const title       = todo.title       ?? '';
    const description = todo.description ?? '';

    card.innerHTML = `
      <div class="message-card__header">
        <div class="message-card__user">
          <div class="message-card__avatar">${initials}</div>
          <span class="message-card__username">${escapeHtml(todo.userName || 'Usuario')}</span>
        </div>
        <span class="message-card__timestamp">${escapeHtml(getCurrentTimestamp())}</span>
      </div>
      <div class="message-card__content">
        <p><strong>Tarea:</strong> ${escapeHtml(title)}</p>
        <p style="margin-top:8px;"><strong>Descripción:</strong> ${escapeHtml(description)}</p>
      </div>
      <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn--primary btn--edit" data-id="${todo.id}">
          <span class="btn__text">Editar</span>
        </button>
        <button type="button" class="btn btn--primary btn--delete" style="background:#dc2626;" data-id="${todo.id}">
          <span class="btn__text">Eliminar</span>
        </button>
      </div>
    `;

    fragment.appendChild(card);
  });

  messagesContainer.appendChild(fragment);
}

// ===========================================
// 6) EVENTOS
// ===========================================

async function handleFormSubmit(event) {
  event.preventDefault();
  if (!validateForm()) return;

  const title       = userMessageInput.value.trim();
  const userName    = userNameInput.value.trim();
  const description = taskDescriptionInput.value.trim();

  try {
    if (editingId !== null) {
      await updateTodo(editingId, { title, userName, description });
      editingId = null;
      setMode(false);
      userMessageInput.focus();
      return;
    }
    await createTodo({ title, userName, description });
    resetForm();
    userNameInput.focus();
  } catch (err) {
    console.error(err);
    showToast('Ocurrió un error al guardar. Revisa la consola.', 'error');
  }
}

function handleInputChange(e) {
  if (e.target === userNameInput && isValidInput(userNameInput.value)) {
    clearError(userNameError);
    userNameInput.classList.remove('error');
  }
  if (e.target === userMessageInput && isValidInput(userMessageInput.value)) {
    clearError(userMessageError);
    userMessageInput.classList.remove('error');
  }
  if (e.target === taskDescriptionInput && isValidInput(taskDescriptionInput.value)) {
    clearError(taskDescriptionError);
    taskDescriptionInput.classList.remove('error');
  }
}

async function handleMessagesContainerClick(e) {
  const btn = e.target.closest('button');
  if (!btn) return;

  const idStr = btn.getAttribute('data-id');
  if (!idStr) return;

  const id = idStr;

  if (btn.classList.contains('btn--delete')) {
    const confirmar = window.confirm('¿Está seguro de eliminar esta tarea?');
    if (!confirmar) return;
    try {
      await deleteTodo(id);
      editingId = null;
      setMode(false);
    } catch (err) {
      console.error(err);
      showToast('No se pudo eliminar. Revisa la consola.', 'error');
    }
    return;
  }

  if (btn.classList.contains('btn--edit')) {
    const todo = lastRenderedTodos.find(t => String(t.id) === String(id));
    if (!todo) return;

    editingId = id;
    userNameInput.value        = todo.userName    || '';
    userMessageInput.value     = todo.title       || '';
    taskDescriptionInput.value = todo.description || '';

    if (formTitle)     formTitle.textContent     = 'Editar tarea';
    if (submitBtnText) submitBtnText.textContent = 'Actualizar tarea';

    userMessageInput.focus();
  }
}

// ===========================================
// 7) INICIALIZACIÓN
// ===========================================

document.addEventListener('DOMContentLoaded', function () {
  console.log('✅ DOM completamente cargado');
  console.log('🧾 CRUD de tareas con JSON Server iniciado');

  messageForm.addEventListener('submit', handleFormSubmit);
  userNameInput.addEventListener('input', handleInputChange);
  userMessageInput.addEventListener('input', handleInputChange);
  taskDescriptionInput.addEventListener('input', handleInputChange);
  messagesContainer.addEventListener('click', handleMessagesContainerClick);

  // Iniciar pantalla de login por ID
  initLoginScreen();
});


// =============================================
// 9) VALIDACIÓN POR ID DE USUARIO — NUEVO
// =============================================

/*
Flujo:
1. Al cargar se muestra #loginScreen y se oculta #appContainer.
2. El usuario escribe un ID (1–10) y hace clic en "Verificar ID".
3. Se hace GET a /todos?userName=... NO; se hace GET /users/:id al servidor.
   Como JSON Server trabaja con /todos, buscamos en /todos si existe alguna
   tarea con ese ID de usuario, o consultamos directamente el recurso raíz.
   → En este caso consultamos `API_BASE_URL` raíz para obtener todos y
     buscamos si el campo id del array de usuarios existe.
   → El ID se valida contra la URL base reemplazando "todos" por "users"
     para buscar en una colección /users del db.json.
4. Si el usuario existe → muestra tarjeta de confirmación y botón cambia a "Ingresar".
5. Si no existe → muestra error.
6. Al confirmar se precarga userName, se oculta login y se muestra la app.
7. "Cerrar sesión" regresa al login.
*/

const API_USERS_URL = API_BASE_URL.replace('/todos', '/users');

function initLoginScreen() {
  const loginScreen    = document.getElementById('loginScreen');
  const appContainer   = document.getElementById('appContainer');
  const loginIdInput   = document.getElementById('loginId');
  const loginBtn       = document.getElementById('loginBtn');
  const loginBtnText   = document.getElementById('loginBtnText');
  const loginIdError   = document.getElementById('loginIdError');
  const loginUserInfo  = document.getElementById('loginUserInfo');
  const loginUserAvatar= document.getElementById('loginUserAvatar');
  const loginUserName  = document.getElementById('loginUserName');
  const headerAvatar   = document.getElementById('headerAvatar');
  const headerUserName = document.getElementById('headerUserName');
  const logoutBtn      = document.getElementById('logoutBtn');

  let usuarioVerificado = null; // Guarda el objeto usuario tras verificar
  let modoIngreso = false;      // false = verificar | true = ingresar

  // — Verificar ID contra /users/:id —
  async function verificarId() {
    const idVal = loginIdInput.value.trim();
    loginIdError.textContent = '';
    loginIdInput.classList.remove('error');

    // Validar que sea número entre 1 y 10
    if (!idVal || isNaN(idVal) || Number(idVal) < 1 || Number(idVal) > 10) {
      loginIdError.textContent = 'Ingresa un ID válido entre 1 y 10.';
      loginIdInput.classList.add('error');
      return;
    }

    loginBtnText.textContent = 'Verificando...';
    loginBtn.disabled = true;

    try {
      const res = await fetch(`${API_USERS_URL}/${idVal}`);

      if (!res.ok) {
        // ID no encontrado en /users
        loginIdError.textContent = `No se encontró ningún usuario con ID ${idVal}.`;
        loginIdInput.classList.add('error');
        loginUserInfo.classList.add('hidden');
        usuarioVerificado = null;
        modoIngreso = false;
        loginBtnText.textContent = 'Verificar ID';
        loginBtn.disabled = false;
        return;
      }

      const user = await res.json();
      usuarioVerificado = user;

      // Mostrar tarjeta de confirmación
      const nombreMostrado = user.name || user.userName || user.nombre || `Usuario ${idVal}`;
      loginUserAvatar.textContent = getInitials(nombreMostrado);
      loginUserName.textContent   = nombreMostrado;
      loginUserInfo.classList.remove('hidden');

      // Cambiar botón a modo "Ingresar"
      modoIngreso = true;
      loginBtnText.textContent = 'Ingresar';
      loginBtn.disabled = false;

    } catch (err) {
      console.error(err);
      loginIdError.textContent = 'Error al conectar con el servidor. ¿Está encendido JSON Server?';
      loginIdInput.classList.add('error');
      loginBtnText.textContent = 'Verificar ID';
      loginBtn.disabled = false;
    }
  }

  // — Ingresar a la app con el usuario verificado —
  function ingresarALaApp() {
    if (!usuarioVerificado) return;

    const nombreMostrado = usuarioVerificado.name
      || usuarioVerificado.userName
      || usuarioVerificado.nombre
      || `Usuario ${usuarioVerificado.id}`;

    // Precargar campo userName del formulario y bloquearlo
    userNameInput.value    = nombreMostrado;
    userNameInput.readOnly = true;

    // Actualizar badge del header
    headerAvatar.textContent   = getInitials(nombreMostrado);
    headerUserName.textContent = nombreMostrado;

    // Mostrar app / ocultar login
    loginScreen.style.display  = 'none';
    appContainer.style.display = '';

    // Cargar tareas
    loadTodos().catch(err => {
      console.error('❌ No se pudo cargar la lista.', err);
      showToast('❌ No se pudo conectar con el servidor.', 'error');
      showEmptyState();
      updateMessageCount(0);
    });
  }

  // — Click en el botón principal del login —
  loginBtn.addEventListener('click', function () {
    if (modoIngreso) {
      ingresarALaApp();
    } else {
      verificarId();
    }
  });

  // Enter en el input
  loginIdInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      if (modoIngreso) ingresarALaApp();
      else verificarId();
    }
  });

  // Resetear si el usuario borra el input
  loginIdInput.addEventListener('input', function () {
    if (loginIdInput.value.trim() === '') {
      loginUserInfo.classList.add('hidden');
      usuarioVerificado = null;
      modoIngreso = false;
      loginBtnText.textContent = 'Verificar ID';
    }
    loginIdError.textContent = '';
    loginIdInput.classList.remove('error');
  });

  // — Cerrar sesión —
  logoutBtn.addEventListener('click', function () {
    usuarioVerificado = null;
    modoIngreso = false;

    // Restaurar campo userName
    userNameInput.value    = '';
    userNameInput.readOnly = false;

    // Limpiar estado CRUD
    editingId = null;
    setMode(false);

    // Limpiar login
    loginIdInput.value           = '';
    loginIdError.textContent     = '';
    loginUserInfo.classList.add('hidden');
    loginBtnText.textContent     = 'Verificar ID';
    loginBtn.disabled            = false;
    loginIdInput.classList.remove('error');

    // Volver al login
    appContainer.style.display = 'none';
    loginScreen.style.display  = '';
    loginIdInput.focus();
  });
}