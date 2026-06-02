/**
 * ============================================
 * GFPI-F-135 V04 - CRUD Vanilla JS + fetch()
 * ============================================
 * Convierte esta UI en un gestor de TAREAS:
 * - Crear tarea (POST)
 * - Listar tareas (GET)
 * - Actualizar tarea (PATCH)
 * - Eliminar tarea (DELETE)
 *
 * Debe correr con JSON Server apuntando a tu db.json.
 *
 * En db.json debe existir un arreglo llamado "todos" o el recurso equivalente.
 * ============================================
 */

const API_BASE_URL = 'http://192.168.128.13:3007/todos';

// ===========================================
// 1) SELECCIÓN DE ELEMENTOS DOM.
// ===========================================

/*Se capturan los elementos del HTML (formulario, campos de entrada, 
n usuario, descripción, contenedores, error messages y contador.)*/

const messageForm = document.getElementById('messageForm');

const userNameInput = document.getElementById('userName');
const userMessageInput = document.getElementById('userMessage');
const taskDescriptionInput = document.getElementById('taskDescription');

const submitBtnText = document.getElementById('submitBtnText');

const userNameError = document.getElementById('userNameError');
const userMessageError = document.getElementById('userMessageError');
const taskDescriptionError = document.getElementById('taskDescriptionError');

const messagesContainer = document.getElementById('messagesContainer');
const emptyState = document.getElementById('emptyState');
const messageCount = document.getElementById('messageCount');

const formTitle = document.getElementById('formTitle');

// ===========================================
// 2) ESTADO.
// ===========================================

let editingId = null; //Guarda ID actualizado. Null = modo editar
let lastRenderedTodos = []; //Busca tarea por ID 

// ===========================================
// 3) VALIDACIONES / UTILIDADES.
// ===========================================

function isValidInput(value) {  //Verificar campos vacíos. True = campo lleno
  return String(value ?? '').trim().length > 0;
}

function showError(errorElement, message) { //Error si la validación falla
  if (!errorElement) return;
  errorElement.textContent = message;
}

function clearError(errorElement) { //Borrar errorMessage si se diligencia correctamente
  if (!errorElement) return;
  errorElement.textContent = '';
}

function validateForm() { //Bloquear envío si los campos están vacíos
  const userName = userNameInput.value;
  const title = userMessageInput.value;
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

function resetForm() { //Limpiar formulario
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
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return now.toLocaleDateString('es-ES', options);
}

function getInitials(name) { //Extracción de iniciales del nombre de usuario
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return '??';

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return parts.map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function escapeHtml(str) { //Cambia caracteres especiales a versión segura
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

function hideEmptyState() {
  emptyState.classList.add('hidden');
}

function showEmptyState() {
  emptyState.classList.remove('hidden');
}

function setMode(isEditing) { //Cambia entre nueva tarea y editar tarea
  editingId = isEditing ? editingId : null;

  if (formTitle) formTitle.textContent = isEditing ? 'Editar tarea' : 'Nueva Tarea';
  if (submitBtnText) submitBtnText.textContent = isEditing ? 'Actualizar tarea' : 'Guardar tarea';

  if (!isEditing) {
    resetForm();
  }
}

// =============================================
// PARTE 3: CICLO COMPLETO DEL CRUD: Esquema
// =============================================

/*
===================== CREATE (Crear tarea) ==============================================================================                                                                                                                        |
1. Acción del usuario:       Llena el formulario y hace clic en "Guardar tarea"                                         |
2. Evento capturado en JS:   messageForm.addEventListener('submit', handleFormSubmit)                                   |
3. Solicitud HTTP enviada:   POST http://192.168.128.13:3007/todos                                                      |
                              Body: { title, userName, description }                                                    |
4. Respuesta del servidor:   201 Created — devuelve el objeto creado con su nuevo id                                    |
5. Actualización del DOM:    Se llama loadTodos() que hace GET y renderTodos() reconstruye las tarjetas                 |                                                                                                                        |
===================== READ (Listar tareas) ==============================================================================                                                                                                                       |
1. Acción del usuario:       Abre la página (no requiere acción manual)                                                 |
2. Evento capturado en JS:   DOMContentLoaded llama a loadTodos()                                                       |
3. Solicitud HTTP enviada:   GET http://192.168.128.13:3007/todos                                                       |
4. Respuesta del servidor:   200 OK — devuelve un arreglo JSON con todas las tareas                                     |
5. Actualización del DOM:    renderTodos(data) convierte cada objeto JSON en una tarjeta HTML                           |
===================== UPDATE (Actualizar tarea) =========================================================================
1. Acción del usuario:       Hace clic en "Editar", modifica los campos y presiona "Actualizar tarea"                   |
2. Evento capturado en JS:   btn--edit detectado en handleMessagesContainerClick,                                       |
                              luego submit en handleFormSubmit                                                          |
3. Solicitud HTTP enviada:   PATCH http://192.168.128.13:3007/todos/:id (mi casita)                                     |
                              Body: { title, userName, description }                                                    |
4. Respuesta del servidor:   200 OK — devuelve el objeto actualizado                                                    |
5. Actualización del DOM:    Se llama loadTodos() y renderTodos() vuelve a construir las tarjetas                       |
===================== DELETE (Eliminar tarea) ===========================================================================

1. Acción del usuario:       Hace clic en "Eliminar" en una tarjeta
2. Evento capturado en JS:   btn--delete detectado en handleMessagesContainerClick
3. Solicitud HTTP enviada:   DELETE http://192.168.128.13:3007/todos/:id
4. Respuesta del servidor:   200 OK — confirma que el recurso fue eliminado
5. Actualización del DOM:    Se llama loadTodos() y la tarjeta eliminada desaparece

============================================================================================================================
*/



// ============================================
// 4) FETCH CRUD (JSON SERVER)
// ============================================

async function apiFetch(url, options) { //LLamada a HTTP (error 404, error 500)
  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }

  return res;
}

async function loadTodos() { //GET... atrae las tareas del server y se ejecuta 
  const res = await apiFetch(API_BASE_URL, { method: 'GET' });

  const data = await res.json();
  console.log('✅ Respuesta GET /todos:', data);

  renderTodos(data);
}

async function createTodo({ title, userName, description }) { //POST... Crea tarea con los datos del formulario
  await apiFetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, userName, description })
  });

  await loadTodos();
}

async function updateTodo(id, { title, userName, description }) { //PATCH... actualiza los campos editados
  await apiFetch(`${API_BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, userName, description })
  });

  await loadTodos();
}

async function deleteTodo(id) { //DELETE... Elimina tarea
  await apiFetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });

  await loadTodos();
}

// ===========================================
// 5) DOM: JSON -> HTML
// ===========================================

//Recibe tareas del servidor y construye tarjetas HTML.
//Cada tarea crea una tarjeta con el avatar (iniciales), name, descripción y botones (editar, eliminar).

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

    const initials = getInitials(todo.userName || 'Usuario');
    const title = todo.title ?? '';
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

      <div style="margin-top: 12px; display:flex; gap:10px; flex-wrap:wrap;">
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

async function handleFormSubmit(event) { //Valida formulario si se da en guardar tarea
  event.preventDefault();

  if (!validateForm()) return;

  const title = userMessageInput.value.trim();
  const userName = userNameInput.value.trim();
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
    showError(userMessageError, 'Ocurrió un error al guardar. Revisa la consola.');
  }
}

function handleInputChange(e) { //Borra mensaje de error en el campo al tener contenido.
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

async function handleMessagesContainerClick(e) { //Detecta clicks del contenedor de tarjetas (eliminar o editar)
  const btn = e.target.closest('button');
  if (!btn) return;

  const idStr = btn.getAttribute('data-id');
  if (!idStr) return;

  const id = idStr;

  if (btn.classList.contains('btn--delete')) {
    // Porque DELETE necesita identificar exactamente el recurso a borrar.
    try {
      await deleteTodo(id);
      editingId = null;
      setMode(false);
    } catch (err) {
      console.error(err);
      showError(userMessageError, 'No se pudo eliminar. Revisa la consola.');
    }
    return;
  }

  if (btn.classList.contains('btn--edit')) {
    // UPDATE: cargar datos en el formulario y permitir editar
    const todo = lastRenderedTodos.find(t => String(t.id) === String(id));
    if (!todo) return;

    editingId = id;

    userNameInput.value = todo.userName || '';
    userMessageInput.value = todo.title || '';
    taskDescriptionInput.value = todo.description || '';

    if (formTitle) formTitle.textContent = 'Editar tarea';
    if (submitBtnText) submitBtnText.textContent = 'Actualizar tarea';

    userMessageInput.focus();
  }
}

// ===========================================
// 7) INICIALIZACIÓN
// ===========================================

//Al estar lista la página, los events (formulario, campos, tarjetas) llaman al load para
// cargar la lista inicial desde el server

document.addEventListener('DOMContentLoaded', function () {
  console.log('✅ DOM completamente cargado');
  console.log('🧾 CRUD de tareas con JSON Server iniciado');

  // printEnunciadoAnswers(); <-- ELIMINADO: función no definida

  messageForm.addEventListener('submit', handleFormSubmit);
  userNameInput.addEventListener('input', handleInputChange);
  userMessageInput.addEventListener('input', handleInputChange);
  taskDescriptionInput.addEventListener('input', handleInputChange);

  messagesContainer.addEventListener('click', handleMessagesContainerClick);

  loadTodos().catch(err => {
    console.error('❌ No se pudo cargar la lista. Asegúrate que JSON Server esté encendido.', err);
    showEmptyState();
    updateMessageCount(0);
  });
});

// ===========================================
// COMPRENDER ANTES DE PROGRAMAR PARTE 1
// ===========================================

/**
¿Qué método HTTP usarían para:

- Crear una tarea
- Método POST: el POST envía datos nuevos al servidor.

- Listar tareas
- Método GET: el GET solicita información sin modificación

- Actualizar una tarea
- método PUT: el PUT reemplaza toda la info de una tarea.
- método PATCH: el PATCH cambia un campo específico 

- Eliminar una tarea
- método DELETE: borra una tarea identificada por su id 

2. ¿Qué información necesitarían enviar al servidor para actualizar o eliminar una tarea?
- El ID de la tarea para poder saber qué es lo que se desea modificar o eliminar. Sin ID no se podría 
saber que es lo que quiero hacer o a qué se lo quiero hacer.

3. ¿En qué momento debe actualizarse el DOM?
- El DOM debe actualizarse cuando el servidor confirma que la operación ha sido realizada correctamente. 
Si esta acción se realiza antes y la operación falla en algo, se va a mostrar información incorrecta. 
Se debería enviar la petición al servidor, verificar que todo esté bien y ahí sí actualizar todo para 
que la interfaz siempre refleje lo que está guardado debidamente.
 */

// ===========================================
// COMPRENDER ANTES DE PROGRAMAR PARTE 2
// ===========================================

/* 
¿En qué momento se transforman JSON en elementos HTML?
- Cuando renderTodos(todos) recibe el JSON y crea elementos HTML con innerHTML

¿Qué ocurre primero: se actualiza el DOM o se envía la solicitud al servidor?
- Primero se envía la solicitud POST al servidor. Después se recarga con GET y ahí se actualiza el DOM.

¿Por qué es importante el id en esta operación?
- Porque el servidor necesita saber qué recurso exacto eliminar (ruta /:id)

¿Diferencia entre modificar el DOM y modificar en el servidor?
- DOM: solo cambia la vista en el navegador
- Servidor: persiste el cambio (se ve al volver a consultar o para otros usuarios).
*/