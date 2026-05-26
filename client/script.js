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

const API_BASE_URL = 'http://192.168.128.26:3007/todos';

// ===========================================
// 1) SELECCIÓN DE ELEMENTOS DOM.
// ===========================================

/*Se capturan los elementos del HTML (formulario, campos de entrada, 
n usuario, descripción, contenedores, error messages y contador.)*/

const messageForm = document.getElementById('messageForm');

const userNameInput = document.getElementById('userName');
const userMessageInput = document.getElementById('userMessage');

const submitBtnText = document.getElementById('submitBtnText');

const userNameError = document.getElementById('userNameError');
const userMessageError = document.getElementById('userMessageError');

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

  return isValid;
}

function resetForm() { //Limpiar formulario
  messageForm.reset();
  clearError(userNameError);
  clearError(userMessageError);
  userNameInput.classList.remove('error');
  userMessageInput.classList.remove('error');
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
    // al salir de modo edición, limpiamos el formulario
    resetForm();
  }
}

// ============================================
// 4) FETCH CRUD (JSON SERVER)
// ============================================

//REFRESCAR PÁGINA

async function apiFetch(url, options) { //LLamada a HTTP (error 404, error 500)
  const res = await fetch(url, options);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }

  return res;
}

async function loadTodos() { //GET... atrae las tareas del server y se ejecuta 
  // READ - Listar tareas
  const res = await apiFetch(API_BASE_URL, { method: 'GET' });

  // Requisito: verificar en consola la respuesta recibida antes de mostrarla
  const data = await res.json();
  console.log('✅ Respuesta GET /todos:', data);

  renderTodos(data);
}

async function createTodo({ title, userName }) { //POST... Crea tarea con los datos del formulario al refrescar lista
  // CREATE - Crear tarea
  await apiFetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, userName })
  });

  // Después de la respuesta del servidor, volver a listar
  await loadTodos();
}

async function updateTodo(id, { title, userName }) { //PATCH... actualiza los campos editados de una tarea existente
  // UPDATE - Actualizar tarea (PATCH)
  await apiFetch(`${API_BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, userName })
  });

  await loadTodos();
}

async function deleteTodo(id) { //DELETE... Elimina tarea
  // DELETE - Eliminar tarea
  await apiFetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });

  await loadTodos();
}

// ===========================================
// 5) DOM: JSON -> HTML
// ===========================================

//Recibe tareas del servidor y contruye tarjetas HTML.
//Cada tarea crea una tarjeta con el avatar (iniciales), name, descripción y botones (editar, eliminar).

//data.id = guardar ID para identificarla 

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

    card.innerHTML = `
      <div class="message-card__header">
        <div class="message-card__user">
          <div class="message-card__avatar">${initials}</div>
          <span class="message-card__username">${escapeHtml(todo.userName || 'Usuario')}</span>
        </div>
        <span class="message-card__timestamp">${escapeHtml(getCurrentTimestamp())}</span>
      </div>
      <div class="message-card__content">${escapeHtml(title)}</div>

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

async function handleFormSubmit(event) { //Valida formulario si se da en guardar tarae
  event.preventDefault();

  if (!validateForm()) return;

  const title = userMessageInput.value.trim();
  const userName = userNameInput.value.trim();

  try {
    if (editingId !== null) {
      await updateTodo(editingId, { title, userName });
      editingId = null;
      setMode(false);
      userMessageInput.focus();
      return;
    }

    await createTodo({ title, userName });
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
}

async function handleMessagesContainerClick(e) { //Detecta clicks del contenedor de tarjetas (eliminar o editar)
  const btn = e.target.closest('button');
  if (!btn) return;

  const idStr = btn.getAttribute('data-id');
  if (!idStr) return;

  const id = idStr;

  if (btn.classList.contains('btn--delete')) {
    // ¿Por qué es importante el id?
    // Respuesta: porque DELETE necesita identificar exactamente el recurso a borrar.
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

    if (formTitle) formTitle.textContent = 'Editar tarea';
    if (submitBtnText) submitBtnText.textContent = 'Actualizar tarea';

    userMessageInput.focus();
  }
}

// ===========================================
// 7) RESPUESTAS REQUERIDAS (consola) + ESQUEMA CICLO CRUD
// ===========================================

function printEnunciadoAnswers() {
  console.log('\n===============================');
  console.log('GFPI-F-135 V04 - RESPUESTAS (CRUD con fetch + db.json)');
  console.log('===============================');
  console.log('\nParte 1: Comprendiendo antes de programar');

  console.log('\n1) Métodos HTTP que usarían:');
  console.log('- Crear una tarea: POST');
  console.log('- Listar tareas: GET');
  console.log('- Actualizar una tarea: PATCH (o PUT)');
  console.log('- Eliminar una tarea: DELETE');

  console.log('\n2) ¿Qué información enviar al servidor para actualizar o eliminar?');
  console.log('- Actualizar: el id de la tarea + los datos a cambiar (title y userName).');
  console.log('- Eliminar: el id de la tarea.');

  console.log('\n3) ¿En qué momento debe actualizarse el DOM?');
  console.log('- Cuando llega la respuesta del servidor (por ejemplo, luego de POST/PATCH/DELETE se hace GET y se renderiza).');
  console.log('- En este código: loadTodos() llama a renderTodos(data) y ahí se transforma JSON -> HTML.');


  console.log('\nParte 2: Implementación guiada');

  console.log('\nREAD (Listar tareas):');
  console.log('- Al cargar la página: loadTodos() hace GET /todos.');
  console.log('- En consola se imprime la respuesta antes de renderizar.');
  console.log('Respuesta: ¿En qué momento se transforman JSON en elementos HTML?');
  console.log('- Cuando renderTodos(todos) recibe el JSON y crea elementos HTML con innerHTML.');

  console.log('\nCREATE (Crear tarea):');
  console.log('- submit del formulario -> POST /todos -> luego loadTodos() (GET) para refrescar DOM.');
  console.log('Respuesta: ¿Qué ocurre primero: se actualiza el DOM o se envía la solicitud al servidor?');
  console.log('- Primero se envía la solicitud POST al servidor. Después se recarga con GET y ahí se actualiza el DOM.');

  console.log('\nDELETE (Eliminar tarea):');
  console.log('- Botón "Eliminar" por tarea -> DELETE /todos/:id -> luego loadTodos().');
  console.log('Respuesta: ¿Por qué es importante el id en esta operación?');
  console.log('- Porque el servidor necesita saber qué recurso exacto eliminar (ruta /:id).');

  console.log('\nUPDATE (Actualizar tarea):');
  console.log('- Botón "Editar" -> carga datos en el formulario -> submit -> PATCH /todos/:id -> loadTodos().');
  console.log('Respuesta: ¿Diferencia entre modificar el DOM y modificar en el servidor?');
  console.log('- DOM: solo cambia la vista en el navegador.');
  console.log('- Servidor: persiste el cambio (se ve al volver a consultar o para otros usuarios).');

  // Esquema del ciclo completo
  console.log('\nIdentificación del ciclo completo (esquema general por operación):');
  console.log('Acción usuario -> Evento JS -> Solicitud HTTP -> Respuesta servidor -> Actualización DOM');

  console.log('\nCiclos específicos:');
  console.log('- CREATE: submit -> POST /todos -> respuesta -> GET /todos -> renderTodos (JSON -> HTML)');
  console.log('- READ: cargar página -> GET /todos -> respuesta JSON -> renderTodos');
  console.log('- UPDATE: click Editar -> PATCH /todos/:id -> respuesta -> GET /todos -> renderTodos');
  console.log('- DELETE: click Eliminar -> DELETE /todos/:id -> respuesta -> GET /todos -> renderTodos');

  console.log('\n===============================');
}

// ===========================================
// 8) INICIALIZACIÓN
// ===========================================

document.addEventListener('DOMContentLoaded', function () {
  console.log('✅ DOM completamente cargado');
  console.log('🧾 CRUD de tareas con JSON Server iniciado');

  printEnunciadoAnswers();

  messageForm.addEventListener('submit', handleFormSubmit);
  userNameInput.addEventListener('input', handleInputChange);
  userMessageInput.addEventListener('input', handleInputChange);

  messagesContainer.addEventListener('click', handleMessagesContainerClick);

  loadTodos().catch(err => {
    console.error('❌ No se pudo cargar la lista. Asegúrate que JSON Server esté encendido.', err);
    showEmptyState();
    updateMessageCount(0);
  });
});

// ===========================================
// COMPRENDER ANTES DE PROGRAMAR
// ===========================================

/**
¿Qué método HTTP usarían para:

• Crear una tarea
- Método POST: el POST envía datos nuevos al servidor.

• Listar tareas
- Método GET: el GET solicita información sin modificación

• Actualizar una tarea
- método PUT: el PUT reemplaza toda la info de una tarea.
- método PATCH: el PATCH cambia un campo específico 

• Eliminar una tarea
- método DELETE: borra una tarea identificada por su id 

2. ¿Qué información necesitarían enviar al servidor para actualizar o eliminar una
tarea?
- El ID de la tarea para poder saber qué es lo que se desea modificar o eliminar. Sin ID no se podría saber que es lo que quiero hacer o a qué
se lo quiero hacer.

3. ¿En qué momento debe actualizarse el DOM?
- El DOM debe actualizarse cuando el servidor confima que la operación ha sido realizada correctamente. Si esta acción se realiza antes dé y la 
operación erra en algo, se va a mostrar información incorrecta. 
Se deberia enviar la petición al servidor, verificar que todo esté bien y ahí si actualizar todo para que la interfaz siempre refleje lo que está 
guardado debidamente
 */