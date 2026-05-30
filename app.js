/**
 * NihongoApp - Logic
 */

const API = 'http://localhost:3001/api';

let state = {
    view: 'search',
    type: 'JP_EN',
    sentences: [],
    currentIndex: 0,
    selectedWords: []
};

// --- DOM Elements ---
const dom = {
    views: {
        search: document.getElementById('view-search'),
        exercise: document.getElementById('view-exercise'),
        history: document.getElementById('view-history')
    },
    btnTypeJpEn: document.getElementById('btn-type-jp-en'),
    btnTypeEnJp: document.getElementById('btn-type-en-jp'),
    btnStart: document.getElementById('btn-start'),
    btnHistory: document.getElementById('btn-history'),
    btnCheck: document.getElementById('btn-check'),
    btnExit: document.getElementById('btn-exit'),
    btnSkip: document.getElementById('btn-skip'),
    btnLater: document.getElementById('btn-later'),
    btnDelete: document.getElementById('btn-delete'),
    btnBack: document.getElementById('btn-back'),
    btnSuccess: document.getElementById('btn-success'),
    btnFail: document.getElementById('btn-fail'),
    
    inputPattern: document.getElementById('input-pattern'),
    inputJp: document.getElementById('input-jp'),
    selectLimit: document.getElementById('select-limit'),
    availabilityBadge: document.getElementById('availability-badge'),
    
    displayJp: document.getElementById('display-jp'),
    displayEn: document.getElementById('display-en'),
    answerArea: document.getElementById('answer-area'),
    wordBank: document.getElementById('word-bank'),
    
    evalSection: document.getElementById('eval-section'),
    textCorrect: document.getElementById('text-correct'),
    historyList: document.getElementById('history-list'),
    
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

// --- Event Listeners ---

// Toggle Exercise Type
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

async function updateAvailability() {
    const pattern = dom.inputPattern.value;
    const res = await fetch(`${API}/sentences/filter?type=${state.type}&pattern=${pattern}&limit=1`);
    const data = await res.json();
    dom.availabilityBadge.innerText = `${data.totalCount} disponibles`;
}

dom.inputPattern.oninput = () => {
    // Debounce simple
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(updateAvailability, 300);
};

// Start Session
dom.btnStart.onclick = async () => {
    const pattern = dom.inputPattern.value;
    const limit = dom.selectLimit.value;
    try {
        const res = await fetch(`${API}/sentences/filter?type=${state.type}&pattern=${pattern}&limit=${limit}`);
        const data = await res.json();
        state.sentences = data.sentences;
        
        if (state.sentences.length > 0) {
            state.currentIndex = 0;
            renderExercise();
            setView('exercise');
        } else {
            alert('No se encontraron oraciones con ese patrón.');
        }
    } catch (err) {
        alert('Error conectando con el servidor.');
    }
};

// Carga inicial
updateAvailability();

// Check / Next
dom.btnCheck.onclick = async () => {
    const current = state.sentences[state.currentIndex];
    
    if (state.type === 'JP_EN') {
        const userAnswer = state.selectedWords.join(' ');
        const isCorrect = current.enTranslations.includes(userAnswer);
        
        await completeSentence(
            isCorrect ? 'correct' : 'incorrect', 
            userAnswer, 
            current.enTranslations[0]
        );
        
        if (!isCorrect) alert(`Respuesta: ${current.enTranslations[0]}`);
        next();
    } else {
        // EN -> JP Manual Eval
        dom.textCorrect.innerText = current.jpTranslations[0];
        dom.evalSection.classList.remove('hidden');
        dom.btnCheck.classList.add('hidden');
        dom.inputJp.disabled = true;
    }
};

// Manual Evaluation Buttons
dom.btnSuccess.onclick = () => handleManualEval('correct');
dom.btnFail.onclick = () => handleManualEval('incorrect');

async function handleManualEval(status) {
    const current = state.sentences[state.currentIndex];
    const userAnswer = dom.inputJp.value;
    await completeSentence(status, userAnswer, current.jpTranslations[0]);
    next();
}

// Exit & History
dom.btnExit.onclick = () => setView('search');
dom.btnBack.onclick = () => setView('search');

dom.btnHistory.onclick = async () => {
    const res = await fetch(`${API}/history?limit=15`);
    const data = await res.json();
    
    dom.historyList.innerHTML = data.map(h => `
        <div class="history-item ${h.status}">
            <strong>${h.sentence}</strong>
            <small>Tu respuesta: ${h.answer}</small>
        </div>
    `).join('');
    
    setView('history');
};

// Skip sentence
dom.btnSkip.onclick = () => {
    next();
};

// Put at the end of the session list
dom.btnLater.onclick = () => {
    const current = state.sentences.splice(state.currentIndex, 1)[0];
    state.sentences.push(current);
    renderExercise();
};

// Manual Delete
dom.btnDelete.onclick = async () => {
    if (confirm('¿Eliminar esta oración permanentemente?')) {
        const current = state.sentences[state.currentIndex];
        await fetch(`${API}/sentences/${current._id}?type=${state.type}`, { method: 'DELETE' });
        next();
    }
};

// --- Core Logic ---

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
            const block = document.createElement('div');
            block.className = 'word-block';
            block.innerText = w;
            block.onclick = () => {
                if (!block.classList.contains('used')) {
                    block.classList.add('used');
                    addWordToAnswer(w, block);
                }
            };
            dom.wordBank.appendChild(block);
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

function addWordToAnswer(word, bankRef) {
    state.selectedWords.push(word);
    const block = document.createElement('div');
    block.className = 'word-block';
    block.innerText = word;
    block.onclick = () => {
        state.selectedWords = state.selectedWords.filter(w => w !== word);
        block.remove();
        bankRef.classList.remove('used');
    };
    dom.answerArea.appendChild(block);
}

async function completeSentence(status, answer, correct) {
    const current = state.sentences[state.currentIndex];
    await fetch(`${API}/sentences/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            originalId: current._id,
            type: state.type,
            sentence: state.type === 'JP_EN' ? current.jpSentence : current.enSentence,
            answer: answer,
            correctAnswer: correct,
            status: status
        })
    });
}

function next() {
    state.currentIndex++;
    if (state.currentIndex < state.sentences.length) {
        renderExercise();
    } else {
        alert('¡Felicidades! Sesión completada.');
        setView('search');
    }
}
