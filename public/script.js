const socket = io();

let lobbyCode = '';
let isHost = false;

function showCreateForm() {
    console.log('Showing create form');
    document.getElementById('initialScreen').classList.add('hidden');
    document.getElementById('createForm').classList.remove('hidden');
    document.getElementById('joinForm').classList.add('hidden');
}

function showJoinForm() {
    console.log('Showing join form');
    document.getElementById('initialScreen').classList.add('hidden');
    document.getElementById('joinForm').classList.remove('hidden');
    document.getElementById('createForm').classList.add('hidden');
}

function backToInitial() {
    console.log('Back to initial');
    document.getElementById('initialScreen').classList.remove('hidden');
    document.getElementById('createForm').classList.add('hidden');
    document.getElementById('joinForm').classList.add('hidden');
}

function createLobby() {
    const hostName = document.getElementById('hostName').value.trim();
    const topic = document.getElementById('topic').value.trim();
    const numQuestions = document.getElementById('numQuestions').value;
    const language = document.getElementById('language').value;

    if (!hostName || !topic || !numQuestions) {
        alert('Please fill in all fields to host the showdown!');
        return;
    }
    socket.emit('createLobby', { hostName, topic, numQuestions, language });
}

function joinLobby() {
    const lobbyCodeInput = document.getElementById('lobbyCode');
    const playerNameInput = document.getElementById('playerName');
    lobbyCode = lobbyCodeInput.value.trim();
    const playerName = playerNameInput.value.trim();

    if (!lobbyCode || !playerName) {
        alert('Enter a lobby code and your name to join the fun!');
        return;
    }

    console.log('Joining lobby:', { lobbyCode, playerName });
    document.getElementById('lobbyInfo').innerText = `Joining Lobby: ${lobbyCode}...`;
    document.getElementById('lobbyInfo').style.display = 'block';
    socket.emit('joinLobby', { lobbyCode, playerName });
}

function startQuiz() {
    if (!isHost) return;
    console.log('Starting quiz for lobby:', lobbyCode);
    socket.emit('startQuiz', lobbyCode);
}

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('lobbyCreated', (code) => {
    lobbyCode = code;
    isHost = true;
    const lobbyInfo = document.getElementById('lobbyInfo');
    lobbyInfo.innerText = `Lobby Created! Code: ${code}`;
    lobbyInfo.style.display = 'block';
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('playersList').classList.remove('hidden');
    document.getElementById('startQuizButton').classList.remove('hidden');
    console.log('Lobby created, code:', code);
});

socket.on('playerJoined', (players) => {
    const lobbyInfo = document.getElementById('lobbyInfo');
    const playersListItems = document.getElementById('playersListItems');
    playersListItems.innerHTML = players.map(p => `<div>${p.name}</div>`).join('');

    if (isHost) {
        lobbyInfo.innerText = `Lobby Code: ${lobbyCode}`;
    } else {
        lobbyInfo.innerText = `Joined Lobby: ${lobbyCode} - Waiting for host to start!`;
        document.getElementById('lobby').classList.add('hidden');
        document.getElementById('playersList').classList.remove('hidden');
        document.getElementById('startQuizButton').classList.add('hidden');
    }
    console.log('Players updated:', players);
});

socket.on('quizStarted', (data) => {
    console.log('Quiz started event received:', data);
    const lobbyInfo = document.getElementById('lobbyInfo');
    lobbyInfo.innerText = 'Quiz has started!';
    lobbyInfo.style.opacity = 1;
    setTimeout(() => {
        lobbyInfo.style.display = 'none';
    }, 1000);
    document.getElementById('playersList').classList.add('hidden');
    document.getElementById('startQuizButton').classList.add('hidden');
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.classList.remove('hidden');
    console.log('Quiz container classList after update:', quizContainer.classList);
    displayQuestion(data);
});

socket.on('nextQuestion', (data) => {
    console.log('Next question:', data);
    displayQuestion(data);
});

socket.on('quizEnded', () => {
    console.log('Quiz ended');
    document.getElementById('quizContainer').classList.add('hidden');
    document.getElementById('leaderboard').classList.remove('hidden');
    document.getElementById('leaderboardList').innerHTML = '<li>Waiting for the champs to finish...</li>';
});

socket.on('leaderboard', (players) => {
    console.log('Leaderboard:', players);
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    players.forEach((player, index) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-item';
        li.innerHTML = `
            <span class="leaderboard-rank">${index + 1}</span>
            <span class="leaderboard-name">${player.name}</span>
            <span class="leaderboard-score">Score: ${player.score} (Time: ${player.timeTaken}ms)</span>
        `;
        leaderboardList.appendChild(li);
    });
});

socket.on('playerLeft', (players) => {
    const playersListItems = document.getElementById('playersListItems');
    playersListItems.innerHTML = players.map(p => `<div>${p.name}</div>`).join('');
    console.log('Player left, updated players:', players);
});

socket.on('error', (err) => {
    const lobbyInfo = document.getElementById('lobbyInfo');
    lobbyInfo.innerText = `Error: ${err}`;
    lobbyInfo.style.display = 'block';
    console.error('Socket.IO error:', err);
});

// Function to speak text using Web Speech API with Hindi support
function speakText(text, lang) {
    console.log('Speaking:', text, 'in', lang);
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang; // 'en-US' or 'hi-IN'
        // Ensure voices are loaded for Hindi
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang === lang) || voices[0]; // Fallback to default if no match
        utterance.voice = voice;
        utterance.onstart = () => console.log(`Started speaking in ${lang} with voice:`, voice.name);
        utterance.onerror = (e) => console.error('Speech error:', e);
        window.speechSynthesis.speak(utterance);
    } else {
        alert('Text-to-Speech is not supported in your browser.');
    }
}

// Load voices and log them for debugging
window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));
};

function displayQuestion(data) {
    console.log('Displaying question:', data);
    const quizContainer = document.getElementById('quizContainer');
    const question = data.question; // Extract question object
    const lang = data.lang || 'en-US'; // Default to English if lang missing

    // Clear previous content and populate quiz
    quizContainer.innerHTML = `
        <h2 id="question" class="text-2xl md:text-3xl mb-6 font-bold">${question.question}</h2>
        <ul id="options" class="space-y-3">
            ${question.options.map(option => {
                const letter = option.split(')')[0].trim();
                return `
                    <li>
                        <button class="option-button" onclick="submitAnswer('${letter}')">${option}</button>
                    </li>
                `;
            }).join('')}
        </ul>
    `;

    // Add Listen button
    const listenButton = document.createElement('button');
    listenButton.className = 'btn-secondary w-full mt-4';
    listenButton.textContent = 'Listen';
    listenButton.addEventListener('click', () => {
        speakText(question.question, lang);
    });
    quizContainer.insertBefore(listenButton, document.getElementById('options'));
}

function submitAnswer(answer) {
    console.log('Submitting answer:', answer);
    socket.emit('answerQuestion', { lobbyCode, answer });
}

document.getElementById('startQuizButton').addEventListener('click', startQuiz);