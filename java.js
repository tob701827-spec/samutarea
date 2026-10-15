const SUPABASE_URL = 'https://qxzlggrepnepjjmsaccz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4emxnZ3JlcG5lcGpqbXNhY2N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjczNzcsImV4cCI6MjEwNzY0MzM3N30.Et1hn0Ela9V5YapQ_TreHe-VsjUb9KUsjH3sJK7SdPA';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Referencias DOM
const loggedOutDiv = document.getElementById('logged-out');
const loggedInDiv = document.getElementById('logged-in');
const postingSection = document.getElementById('posting-section');
const userInfo = document.getElementById('user-info');
const messagesContainer = document.getElementById('messages-container');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnRegister = document.getElementById('btn-register');
const btnLogout = document.getElementById('btn-logout');
const messageInput = document.getElementById('message-input');
const btnPost = document.getElementById('btn-post');

let currentUser = null;

// Inicializar estado de sesión y escuchar cambios de autenticación
async function initSession() {
    const { data: { session } } = await supabase.auth.getSession();
    handleSession(session);

    supabase.auth.onAuthStateChange((_event, session) => {
        handleSession(session);
    });
}

function handleSession(session) {
    currentUser = session?.user || null;
    if (currentUser) {
        loggedOutDiv.classList.add('hidden');
        loggedInDiv.classList.remove('hidden');
        postingSection.classList.remove('hidden');
        userInfo.textContent = `Conectado como: ${currentUser.email}`;
    } else {
        loggedOutDiv.classList.remove('hidden');
        loggedInDiv.classList.add('hidden');
        postingSection.classList.add('hidden');
        userInfo.textContent = '';
    }
    loadMessages();
}

// 1. REGISTRO
btnRegister.addEventListener('click', async () => {
    const { error } = await supabase.auth.signUp({
        email: emailInput.value,
        password: passwordInput.value,
    });
    if (error) alert('Error en registro: ' + error.message);
    else alert('¡Registro exitoso! Ya puedes iniciar sesión.');
});

// 2. INICIAR SESIÓN
btnLogin.addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
    });
    if (error) alert('Error al iniciar sesión: ' + error.message);
});

// 3. CERRAR SESIÓN
btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
});

// 4. PUBLICAR MENSAJE
btnPost.addEventListener('click', async () => {
    const content = messageInput.value.trim();
    if (!content) return;

    const { error } = await supabase.from('messages').insert([
        { content: content, user_id: currentUser.id, user_email: currentUser.email }
    ]);

    if (error) {
        alert('Error al publicar (bloqueado por políticas RLS): ' + error.message);
    } else {
        messageInput.value = ''; // Limpiar caja de texto (el mensaje aparecerá en tiempo real)
    }
});

// 5. CARGAR MENSAJES DESDE LA BASE DE DATOS
async function loadMessages() {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error al cargar mensajes:', error.message);
        return;
    }

    renderMessages(data);
}

// 6. RENDERIZAR EN EL HTML DE FORMA DINÁMICA
function renderMessages(messages) {
    messagesContainer.innerHTML = '';
    messages.forEach(msg => {
        const card = document.createElement('div');
        card.className = 'message-card';
        
        let actionsHTML = '';
        // Validar si el usuario actual es el autor para permitir eliminar de forma interactiva
        if (currentUser && currentUser.id === msg.user_id) {
            actionsHTML = `
                <div class="message-actions">
                    <button class="btn-delete" onclick="deleteMessage('${msg.id}')">Eliminar</button>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="author">Por: ${msg.user_email} (${new Date(msg.created_at).toLocaleString()})</div>
            <div class="content">${escapeHtml(msg.content)}</div>
            ${actionsHTML}
        `;
        messagesContainer.appendChild(card);
    });
}

// 7. ELIMINAR MENSAJE PROPIO
window.deleteMessage = async function(id) {
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', id);

    if (error) {
        alert('No autorizado para eliminar: ' + error.message);
    }
    // No hace falta recargar manualmente, el canal en tiempo real actualizará la vista
};

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 8. CONFIGURAR CANAL EN TIEMPO REAL (REALTIME SUBSCRIPTION)
// Esto hace que la página sea interactiva automáticamente al haber cambios en la tabla 'messages'
supabase
  .channel('public:messages')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
      // Cada vez que ocurra un INSERT, UPDATE o DELETE en la BD, recarga la lista al instante
      loadMessages();
  })
  .subscribe();

// Inicializar la aplicación al cargar
initSession();