/**
 * NihongoApp - Logic (With Modules System)
 */

const API = '/api';

let state = {
    view: 'map', // 'map', 'search', 'exercise'
    type: 'JP_EN',
    sentences: [],
    currentIndex: 0,
    selectedWords: []
};

// --- DOM Elements ---
const dom = {
    views: {
        map: document.getElementById('view-map'),
        search: document.getElementById('view-search'),
        exercise: document.getElementById('view-exercise')
    },
    // Map View
    modulePath: document.getElementById('module-path'),
    moduleCreator: document.getElementById('module-creator'),
    inputModuleTitle: document.getElementById('module-title'),
    inputModulePattern: document.getElementById('module-pattern'),
    selectModuleType: document.getElementById('module-type'),
    btnShowCreator: document.getElementById('btn-show-creator'),
    btnSaveModule: document.getElementById('btn-save-module'),
    btnCancelModule: document.getElementById('btn-cancel-module'),
    btnGotoFree: document.getElementById('btn-goto-free'),

    // Search View
    btnGotoMap: document.getElementById('btn-goto-map'),
    btnTypeJpEn: document.getElementById('btn-type-jp-en'),
    btnTypeEnJp: document.getElementById('btn-type-en-jp'),
    btnStart: document.getElementById('btn-start'),
    inputPattern: document.getElementById('input-pattern'),
    selectLimit: document.getElementById('select-limit'),
    availabilityBadge: document.getElementById('availability-badge'),

    // Exercise View
    btnExit: document.getElementById('btn-exit'),
    btnSkip: document.getElementById('btn-skip'),
    btnLater: document.getElementById('btn-later'),
    btnDelete: document.getElementById('btn-delete'),
    btnCheck: document.getElementById('btn-check'),
    btnSuccess: document.getElementById('btn-success'),
    btnFail: document.getElementById('btn-fail'),
    
    inputJp: document.getElementById('input-jp'),
    displayJp: document.getElementById('display-jp'),
    displayEn: document.getElementById('display-en'),
    answerArea: document.getElementById('answer-area'),
    wordBank: document.getElementById('word-bank'),
    evalSection: document.getElementById('eval-section'),
    textCorrect: document.getElementById('text-correct'),
    
    modes: {
        jpEn: document.getElementById('exercise-jp-en'),
        enJp: document.getElementById('exercise-en-jp')
    }
};

// --- Navigation ---
function setView(v) {
    Object.values(dom.views).forEach(el => el.classList.add('hidden'));
    dom.views[v].classList.remove('hidden');
    state.view = v;
}

// --- Modules Logic ---

async function loadModules() {
    const res = await fetch(`${API}/modules`);
    const modules = await res.json();
    
    // Obtenemos el conteo para cada módulo según su tipo
    const modulesWithProgress = await Promise.all(modules.map(async m => {
        const check = await fetch(`${API}/sentences/filter?type=${m.type || 'JP_EN'}&pattern=${m.pattern}&limit=1`);
        const data = await check.json();
        return { ...m, totalPending: data.totalCount };
    }));
    
    dom.modulePath.innerHTML = modulesWithProgress.map((m, i) => `
        <div class="module-node ${m.totalPending === 0 ? 'completed' : ''}" onclick="startModuleSession('${m.pattern}', '${m.type || 'JP_EN'}')">
            <button class="btn-delete-module" onclick="event.stopPropagation(); deleteModule('${m._id}')">×</button>
            <div class="module-circle">${m.totalPending === 0 ? '👑' : '★'}</div>
            <div class="module-title">${m.title}</div>
            <div class="module-type-badge">${(m.type || 'JP_EN') === 'JP_EN' ? 'JP' : 'EN'}</div>
            ${m.totalPending > 0 ? `<div class="module-count">${m.totalPending}</div>` : ''}
        </div>
    `).join('');
}

async function saveModule() {
    const title = dom.inputModuleTitle.value;
    const pattern = dom.inputModulePattern.value;
    const type = dom.selectModuleType.value;
    if (!title || !pattern) return alert('Completa los campos');

    await fetch(`${API}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, pattern, type })
    });

    dom.inputModuleTitle.value = '';
    dom.inputModulePattern.value = '';
    dom.moduleCreator.classList.add('hidden');
    loadModules();
}

async function deleteModule(id) {
    if (!confirm('¿Eliminar este módulo?')) return;
    await fetch(`${API}/modules/${id}`, { method: 'DELETE' });
    loadModules();
}

function startModuleSession(pattern, type) {
    state.type = type;
    startSession(pattern, 10);
}

// --- Search & Session Logic ---

async function startSession(pattern, limit) {
    try {
        const res = await fetch(`${API}/sentences/filter?type=${state.type}&pattern=${pattern}&limit=${limit}`);
        const data = await res.json();
        state.sentences = data.sentences;
        
        if (state.sentences.length > 0) {
            state.currentIndex = 0;
            renderExercise();
            setView('exercise');
        } else {
            alert('No se encontraron oraciones para este módulo.');
        }
    } catch (err) {
        alert('Error conectando con el servidor.');
    }
}

async function updateAvailability() {
    const pattern = dom.inputPattern.value;
    const res = await fetch(`${API}/sentences/filter?type=${state.type}&pattern=${pattern}&limit=1`);
    const data = await res.json();
    dom.availabilityBadge.innerText = `${data.totalCount} disponibles`;
}

// --- Exercise Logic ---

function renderExercise() {
    const current = state.sentences[state.currentIndex];
    dom.btnCheck.classList.remove('hidden');
    
    if (state.type === 'JP_EN') {
        dom.modes.jpEn.classList.remove('hidden');
        dom.modes.enJp.classList.add('hidden');
        dom.displayJp.innerText = current.jpSentence;
        dom.answerArea.innerHTML = '';
        state.selectedWords = [];
        
        const words = current.enTranslations[0].split(' ').sort(() => Math.random() - 0.5);
        dom.wordBank.innerHTML = '';
        words.forEach(w => {
            const b = document.createElement('div');
            b.className = 'word-block';
            b.innerText = w;
            b.onclick = () => {
                if (!b.classList.contains('used')) {
                    b.classList.add('used');
                    addWordToAnswer(w, b);
                }
            };
            dom.wordBank.appendChild(b);
        });
    } else {
        dom.modes.jpEn.classList.add('hidden');
        dom.modes.enJp.classList.remove('hidden');
        dom.evalSection.classList.add('hidden');
        dom.displayEn.innerText = current.enSentence;
        dom.inputJp.value = '';
        dom.inputJp.disabled = false;
    }
}

// --- Event Listeners ---

dom.btnShowCreator.onclick = () => dom.moduleCreator.classList.toggle('hidden');
dom.btnCancelModule.onclick = () => dom.moduleCreator.classList.add('hidden');
dom.btnSaveModule.onclick = saveModule;
dom.btnGotoFree.onclick = () => setView('search');
dom.btnGotoMap.onclick = () => setView('map');

dom.btnTypeJpEn.onclick = () => {
    state.type = 'JP_EN';
    dom.btnTypeJpEn.className = 'duo-button btn-active';
    dom.btnTypeEnJp.className = 'duo-button btn-secondary';
    updateAvailability();
};

dom.btnTypeEnJp.onclick = () => {
    state.type = 'EN_JP';
    dom.btnTypeEnJp.className = 'duo-button btn-active';
    dom.btnTypeJpEn.className = 'duo-button btn-secondary';
    updateAvailability();
};

dom.inputPattern.oninput = () => {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(updateAvailability, 300);
};

dom.btnStart.onclick = () => {
    startSession(dom.inputPattern.value, dom.selectLimit.value);
};

dom.btnCheck.onclick = async () => {
    const current = state.sentences[state.currentIndex];
    if (state.type === 'JP_EN') {
        const userAnswer = state.selectedWords.join(' ');
        // VALIDACIÓN: Chequear contra todas las traducciones posibles
        const isCorrect = current.enTranslations.some(t => t.toLowerCase().trim() === userAnswer.toLowerCase().trim());
        
        await completeSentence(
            isCorrect ? 'correct' : 'incorrect', 
            userAnswer, 
            current.enTranslations
        );
        
        if (!isCorrect) alert(`Respuestas posibles:\n• ${current.enTranslations.join('\n• ')}`);
        next();
    } else {
        // EN -> JP Manual Eval: Mostrar todas las opciones japonesas
        dom.textCorrect.innerHTML = current.jpTranslations.map(t => `<div>• ${t}</div>`).join('');
        dom.evalSection.classList.remove('hidden');
        dom.btnCheck.classList.add('hidden');
        dom.inputJp.disabled = true;
    }
};

dom.btnSuccess.onclick = () => handleManualEval('correct');
dom.btnFail.onclick = () => handleManualEval('incorrect');

async function handleManualEval(status) {
    const current = state.sentences[state.currentIndex];
    await completeSentence(status, dom.inputJp.value, current.jpTranslations);
    next();
}

dom.btnSkip.onclick = next;
dom.btnLater.onclick = () => {
    const current = state.sentences.splice(state.currentIndex, 1)[0];
    state.sentences.push(current);
    renderExercise();
};

dom.btnDelete.onclick = async () => {
    if (confirm('¿Borrar permanentemente?')) {
        await fetch(`${API}/sentences/${state.sentences[state.currentIndex]._id}?type=${state.type}`, { method: 'DELETE' });
        next();
    }
};

dom.btnExit.onclick = () => setView('map');

async function completeSentence(status, answer, correctAnswers) {
    const current = state.sentences[state.currentIndex];
    await fetch(`${API}/sentences/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            originalId: current._id,
            type: state.type,
            sentence: state.type === 'JP_EN' ? current.jpSentence : current.enSentence,
            answer, 
            correctAnswers, 
            status
        })
    });
}

function next() {
    state.currentIndex++;
    if (state.currentIndex < state.sentences.length) {
        renderExercise();
    } else {
        alert('Sesión completada');
        setView('map');
    }
}

function addWordToAnswer(word, bankRef) {
    state.selectedWords.push(word);
    const b = document.createElement('div');
    b.className = 'word-block';
    b.innerText = word;
    b.onclick = () => {
        state.selectedWords = state.selectedWords.filter(w => w !== word);
        b.remove();
        bankRef.classList.remove('used');
    };
    dom.answerArea.appendChild(b);
}

// Carga inicial
loadModules();
updateAvailability();
setView('map');
