
/* ======= WhatsApp Web com Gemini AI =======
   Características:
   - Integração completa com Gemini AI
   - Polling inteligente otimizado
   - Interface moderna e responsiva
*/

const API_BASE = '/api';
const POLLING_INTERVAL = 5000;
const IDLE_POLLING_INTERVAL = 10000;

// Estado da aplicação
let state = {
    conversations: {},
    currentConvId: "conv-default",
    geminiEnabled: false,
    online: true,
    apiConnected: false,
    lastUpdate: Date.now(),
    isActive: true
};

// --- Utils
function nowIso(){ return new Date().toISOString(); }

function fmtTime(iso){
    const d = new Date(iso);
    return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- API Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        state.apiConnected = true;
        updateApiStatus();
        
        return await response.json();
    } catch (error) {
        state.apiConnected = false;
        updateApiStatus();
        log('Erro na API:', error.message);
        throw error;
    }
}

async function loadConversations() {
    try {
        state.conversations = await apiRequest('/conversations');
        return state.conversations;
    } catch (error) {
        log('Erro ao carregar conversas');
        return {};
    }
}

async function loadState() {
    try {
        const data = await apiRequest('/state');
        state.geminiEnabled = data.geminiEnabled || false;
        updateGeminiIndicator();
        return data;
    } catch (error) {
        return state;
    }
}

async function createConversation(name) {
    try {
        const newConv = await apiRequest('/conversations', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        state.conversations[newConv.id] = newConv;
        return newConv;
    } catch (error) {
        log('Erro ao criar conversa:', error.message);
        throw error;
    }
}

async function sendMessage(convId, messageData) {
    try {
        const message = await apiRequest(`/conversations/${convId}/messages`, {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
        
        if (state.conversations[convId]) {
            state.conversations[convId].messages.push(message);
        }
        
        return message;
    } catch (error) {
        log('Erro ao enviar mensagem:', error.message);
        throw error;
    }
}

async function deleteConversation(convId) {
    try {
        await apiRequest(`/conversations/${convId}`, {
            method: 'DELETE'
        });
        delete state.conversations[convId];
        return true;
    } catch (error) {
        log('Erro ao deletar conversa:', error.message);
        throw error;
    }
}

async function clearMessages(convId) {
    try {
        await apiRequest(`/conversations/${convId}/messages`, {
            method: 'DELETE'
        });
        
        if (state.conversations[convId]) {
            state.conversations[convId].messages = [];
        }
        
        return true;
    } catch (error) {
        log('Erro ao limpar mensagens:', error.message);
        throw error;
    }
}

async function toggleGemini() {
    try {
        const result = await apiRequest('/gemini/toggle', {
            method: 'POST'
        });
        state.geminiEnabled = result.geminiEnabled;
        updateGeminiIndicator();
        log(result.message);
        return state.geminiEnabled;
    } catch (error) {
        log('Erro ao alternar Gemini:', error.message);
        throw error;
    }
}

async function getGeminiStatus() {
    try {
        const status = await apiRequest('/gemini/status');
        state.geminiEnabled = status.geminiEnabled;
        updateGeminiIndicator();
        return status;
    } catch (error) {
        return { geminiEnabled: false, apiConfigured: false };
    }
}

// --- DOM Elements
const el = {
    convList: document.getElementById('conversations'),
    messages: document.getElementById('messages'),
    chatTitle: document.getElementById('chatTitle'),
    chatSub: document.getElementById('chatSub'),
    statusText: document.getElementById('statusText'),
    statusIndicator: document.getElementById('statusIndicator'),
    editor: document.getElementById('editor'),
    send: document.getElementById('send'),
    log: document.getElementById('log'),
    cfgDelay: document.getElementById('cfgDelay'),
    cfgInsert: document.getElementById('cfgInsert'),
    autoBtn: document.getElementById('autoBtn'),
    newConvBtn: document.getElementById('newConvBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    clearHistory: document.getElementById('clearHistory'),
    clearCurrent: document.getElementById('clearCurrent'),
    searchConv: document.getElementById('searchConv'),
    geminiBtn: document.getElementById('geminiBtn'),
    geminiIndicator: document.getElementById('geminiIndicator'),
    typingIndicator: document.getElementById('typingIndicator'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    sidebar: document.getElementById('sidebar'),
    overlay: document.getElementById('overlay'),
    apiStatus: document.getElementById('apiStatus')
};

function log(...args){
    const txt = args.map(a => (typeof a==='object'?JSON.stringify(a):a)).join(' ');
    const time = new Date().toLocaleTimeString();
    el.log.innerHTML += `[${time}] ${txt}<br>`;
    el.log.scrollTop = el.log.scrollHeight;
}

function updateApiStatus() {
    if (state.apiConnected) {
        el.apiStatus.textContent = 'API Conectada';
        el.apiStatus.className = 'api-status connected';
    } else {
        el.apiStatus.textContent = 'API Desconectada';
        el.apiStatus.className = 'api-status disconnected';
    }
}

function updateGeminiIndicator() {
    if (state.geminiEnabled) {
        el.geminiBtn.innerHTML = '🤖 Gemini ON';
        el.geminiBtn.style.background = '#8B5CF6';
        el.geminiIndicator.innerHTML = '🤖 Gemini AI ●';
        el.geminiIndicator.style.background = '#f3e8ff';
    } else {
        el.geminiBtn.innerHTML = '🤖 Gemini OFF';
        el.geminiBtn.style.background = '#9aa4a6';
        el.geminiIndicator.innerHTML = '🤖 Gemini AI';
        el.geminiIndicator.style.background = '#f2f6f7';
    }
}

function hasSignificantChanges(oldData, newData) {
    if (!oldData || !newData) return true;
    
    const oldConv = oldData.conversations?.[state.currentConvId];
    const newConv = newData.conversations?.[state.currentConvId];
    
    if (!oldConv || !newConv) return true;
    
    if (oldConv.messages.length !== newConv.messages.length) return true;
    
    if (oldConv.messages.length > 0 && newConv.messages.length > 0) {
        const lastOld = oldConv.messages[oldConv.messages.length - 1];
        const lastNew = newConv.messages[newConv.messages.length - 1];
        if (lastOld.id !== lastNew.id || lastOld.text !== lastNew.text) {
            return true;
        }
    }
    
    return false;
}

function renderConversations(filter = '') {
    el.convList.innerHTML = '';
    
    const convs = Object.values(state.conversations)
        .filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => {
            const ta = a.messages.length ? a.messages[a.messages.length-1].ts : '';
            const tb = b.messages.length ? b.messages[b.messages.length-1].ts : '';
            return tb.localeCompare(ta);
        });

    if (convs.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'small';
        empty.style.padding = '20px';
        empty.style.textAlign = 'center';
        empty.textContent = 'Nenhuma conversa encontrada';
        el.convList.appendChild(empty);
        return;
    }

    convs.forEach(c => {
        const last = c.messages[c.messages.length-1];
        const snippet = last ? (last.text.slice(0,40) + (last.text.length > 40 ? '...' : '')) : 'Nenhuma mensagem';
        const time = last ? fmtTime(last.ts) : '';
        const div = document.createElement('div');
        div.className = 'conv' + (c.id === state.currentConvId ? ' active' : '');
        div.innerHTML = `
            <div class="meta">
                <div class="name">${c.name}</div>
                <div class="snippet">${snippet}</div>
            </div>
            <div class="time">${time}</div>
        `;
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');
        div.addEventListener('click', () => { 
            state.currentConvId = c.id; 
            render(); 
            closeMobileMenu();
        });
        div.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' || e.key === ' ') {
                state.currentConvId = c.id; 
                render(); 
                closeMobileMenu();
                e.preventDefault();
            }
        });
        el.convList.appendChild(div);
    });
}

function renderMessages() {
    const conv = state.conversations[state.currentConvId];
    if (!conv) return;
    
    const wasScrolledToBottom = el.messages.scrollHeight - el.messages.clientHeight <= el.messages.scrollTop + 50;
    
    const scrollTopBefore = el.messages.scrollTop;
    const scrollHeightBefore = el.messages.scrollHeight;
    
    el.messages.innerHTML = '';
    const typingIndicatorClone = el.typingIndicator.cloneNode(true);
    el.messages.appendChild(typingIndicatorClone);
    
    conv.messages.forEach(m => {
        const b = document.createElement('div');
        b.className = `bubble ${m.who === 'mine' ? 'mine' : 'their'}`;
        if (m.who === 'their' && state.geminiEnabled) {
            b.classList.add('gemini');
        }
        b.innerHTML = `<div>${escapeHtml(m.text)}</div>
            <div class="meta-time">${fmtTime(m.ts)} ${m.who === 'mine' ? (m.status ? ' • ' + m.status : '') : ''}</div>`;
        el.messages.appendChild(b);
    });
    
    if (wasScrolledToBottom) {
        el.messages.scrollTop = el.messages.scrollHeight;
    } else {
        const newScrollHeight = el.messages.scrollHeight;
        const heightDiff = newScrollHeight - scrollHeightBefore;
        if (heightDiff > 0) {
            el.messages.scrollTop = scrollTopBefore + heightDiff;
        } else {
            el.messages.scrollTop = scrollTopBefore;
        }
    }
    
    el.chatTitle.textContent = conv.name;
    const last = conv.messages[conv.messages.length-1];
    el.chatSub.innerHTML = `<span id="statusIndicator" class="status-indicator ${state.online ? 'status-online' : 'status-offline'}"></span>
        <span id="statusText">${state.online ? 'Online' : 'Offline'}</span>
        • Última atividade: ${last ? fmtTime(last.ts) : '--'}`;
    
    el.statusIndicator = document.getElementById('statusIndicator');
    el.statusText = document.getElementById('statusText');
}

let lastRenderData = null;

async function render(force = false) {
    try {
        const oldData = lastRenderData;
        const newConversations = await loadConversations();
        const newState = await loadState();
        
        const newData = {
            conversations: newConversations,
            geminiEnabled: newState.geminiEnabled
        };
        
        if (force || hasSignificantChanges(oldData, newData)) {
            state.conversations = newConversations;
            state.geminiEnabled = newState.geminiEnabled;
            
            renderConversations(el.searchConv.value || '');
            renderMessages();
            updateGeminiIndicator();
            
            lastRenderData = JSON.parse(JSON.stringify(newData));
            state.lastUpdate = Date.now();
        }
    } catch (error) {
        log('Erro no render:', error.message);
    }
}

function showTyping() {
    el.typingIndicator.classList.add('active');
    el.messages.scrollTop = el.messages.scrollHeight;
}

function hideTyping() {
    el.typingIndicator.classList.remove('active');
}

function closeMobileMenu() {
    if (window.innerWidth <= 880) {
        el.sidebar.classList.remove('active');
        el.overlay.classList.remove('active');
    }
}

// --- Event Listeners
el.send.addEventListener('click', async () => {
    const text = el.editor.textContent.trim();
    if (!text) return;
    
    try {
        const tempId = 'temp-' + Date.now();
        const tempMessage = {
            id: tempId,
            who: 'mine',
            text: text,
            ts: nowIso(),
            status: 'sending'
        };
        
        if (state.conversations[state.currentConvId]) {
            state.conversations[state.currentConvId].messages.push(tempMessage);
            renderMessages();
        }
        
        el.editor.textContent = '';
        
        const message = await sendMessage(state.currentConvId, {
            who: 'mine',
            text: text,
            status: 'sent'
        });
        
        if (state.conversations[state.currentConvId]) {
            const messages = state.conversations[state.currentConvId].messages;
            const tempIndex = messages.findIndex(m => m.id === tempId);
            if (tempIndex !== -1) {
                messages.splice(tempIndex, 1);
            }
            messages.push({...message, status: 'delivered'});
            renderMessages();
        }
        
    } catch (error) {
        log('Erro ao enviar mensagem:', error.message);
        if (state.conversations[state.currentConvId]) {
            const messages = state.conversations[state.currentConvId].messages;
            const tempIndex = messages.findIndex(m => m.id && m.id.startsWith('temp-'));
            if (tempIndex !== -1) {
                messages.splice(tempIndex, 1);
                renderMessages();
            }
        }
    }
});

el.editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        el.send.click();
    }
});

el.newConvBtn.addEventListener('click', async () => {
    const name = prompt('Nome da nova conversa:');
    if (!name) return;
    
    try {
        const newConv = await createConversation(name);
        state.currentConvId = newConv.id;
        await render();
        closeMobileMenu();
        log(`Nova conversa criada: "${name}"`);
    } catch (error) {
        log('Erro ao criar conversa:', error.message);
    }
});

el.refreshBtn.addEventListener('click', async () => {
    await render();
    log('Conversas atualizadas');
});

el.clearHistory.addEventListener('click', async () => {
    if (!confirm('Isso irá limpar TODAS as conversas (exceto a padrão). Continuar?')) return;
    
    try {
        const convIds = Object.keys(state.conversations);
        for (const convId of convIds) {
            if (convId !== 'conv-default') {
                await deleteConversation(convId);
            }
        }
        await render();
        log('Histórico limpo');
    } catch (error) {
        log('Erro ao limpar histórico:', error.message);
    }
});

el.clearCurrent.addEventListener('click', async () => {
    const conv = state.conversations[state.currentConvId];
    if (!conv || conv.messages.length === 0) return;
    
    if (!confirm(`Limpar todas as mensagens de "${conv.name}"?`)) return;
    
    try {
        await clearMessages(state.currentConvId);
        await render();
        log(`Conversa "${conv.name}" limpa`);
    } catch (error) {
        log('Erro ao limpar conversa:', error.message);
    }
});

el.searchConv.addEventListener('input', debounce(() => renderConversations(el.searchConv.value), 300));

el.geminiBtn.addEventListener('click', async () => {
    try {
        await toggleGemini();
    } catch (error) {
        log('Erro ao alternar Gemini:', error.message);
    }
});

el.mobileMenuBtn.addEventListener('click', () => {
    el.sidebar.classList.add('active');
    el.overlay.classList.add('active');
});

el.overlay.addEventListener('click', closeMobileMenu);

// ======= POLLING INTELIGENTE =======
let pollingInterval;
let idleTimeout;

function startPolling() {
    stopPolling();
    
    const checkUpdates = async () => {
        if (state.apiConnected && state.isActive) {
            await render(false);
        }
    };
    
    pollingInterval = setInterval(checkUpdates, POLLING_INTERVAL);
    
    idleTimeout = setInterval(() => {
        if (!state.isActive && state.apiConnected) {
            render(false);
        }
    }, IDLE_POLLING_INTERVAL);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    if (idleTimeout) {
        clearInterval(idleTimeout);
        idleTimeout = null;
    }
}

function resetActivityTimer() {
    state.isActive = true;
    
    if (!pollingInterval) {
        startPolling();
    }
    
    setTimeout(() => {
        state.isActive = false;
    }, 30000);
}

// ======= SCRIPT AUTOMATION =======
async function enviarScript(scriptText, config = {}) {
    const cfg = {
        delayEntreEnvios: Number(config.delayEntreEnvios ?? el.cfgDelay.value ?? 300),
        delayInsercao: Number(config.delayInsercao ?? el.cfgInsert.value ?? 150),
        tentativasEnvio: Number(config.tentativasEnvio ?? 3),
        logEnabled: config.log ?? true
    };

    const wait = ms => new Promise(r => setTimeout(r, ms));
    const lines = scriptText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    
    if (cfg.logEnabled) log(`Script: iniciando envio de ${lines.length} mensagem(ns)`);

    for (const [idx, line] of lines.entries()) {
        if (!line) continue;

        el.editor.textContent = line;
        el.editor.dispatchEvent(new InputEvent('input', {bubbles: true}));

        if (cfg.logEnabled) log(`Inserido [${idx+1}/${lines.length}]: ${line}`);

        await wait(cfg.delayInsercao);

        let enviado = false;
        for (let attempt = 1; attempt <= cfg.tentativasEnvio && !enviado; attempt++) {
            try {
                await sendMessage(state.currentConvId, {
                    who: 'mine',
                    text: line,
                    status: 'sent'
                });
                enviado = true;
                if (cfg.logEnabled) log(`Mensagem enviada (tentativa ${attempt})`);
                
                await render(true);
                
            } catch (err) {
                if (cfg.logEnabled) log(`Erro envio (tentativa ${attempt}):`, err.message);
                await wait(150);
            }
        }

        if (!enviado) {
            if (cfg.logEnabled) log(`Falha ao enviar mensagem: "${line}"`);
        }

        await wait(cfg.delayEntreEnvios);
    }

    if (cfg.logEnabled) log(`Script concluído — ${lines.length} mensagens processadas`);
    return lines.length;
}

el.autoBtn.addEventListener('click', async () => {
    const example = `Olá! Este é um teste do WhatsApp com Gemini AI.
Estou testando a integração entre Flask e a API do Google Gemini.
A interface está funcionando perfeitamente!
Mensagem final do teste.`;
    try {
        const total = await enviarScript(example, {log: true});
        log('AutoExec finalizado. Total:', total);
    } catch (
