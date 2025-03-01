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
    console.log('Starting quiz for lobby:', lobbyCode); // Debug
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
    document.getElementById('lobby').classList.add('hidden'); // Use class instead of style
    document.getElementById('playersList').classList.remove('hidden');
    document.getElementById('startQuizButton').classList.remove('hidden');
    console.log('Lobby created, code:', code); // Debug
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
    console.log('Players updated:', players); // Debug
});

socket.on('quizStarted', (question) => {
    console.log('Quiz started, question:', question);
    const lobbyInfo = document.getElementById('lobbyInfo');
    lobbyInfo.innerText = 'Quiz has started!';
    lobbyInfo.style.opacity = 1;
    setTimeout(() => {
        lobbyInfo.style.display = 'none';
    }, 1000);
    document.getElementById('playersList').classList.add('hidden');
    document.getElementById('startQuizButton').classList.add('hidden');
    document.getElementById('quizContainer').classList.remove('hidden');
    displayQuestion(question);
});

socket.on('nextQuestion', (question) => {
    console.log('Next question:', question); // Debug
    displayQuestion(question);
});

socket.on('quizEnded', () => {
    console.log('Quiz ended'); // Debug
    document.getElementById('quizContainer').classList.add('hidden');
    document.getElementById('leaderboard').classList.remove('hidden');
    document.getElementById('leaderboardList').innerHTML = '<li>Waiting for the champs to finish...</li>';
});

socket.on('leaderboard', (players) => {
    console.log('Leaderboard:', players); // Debug
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
    console.log('Player left, updated players:', players); // Debug
});

socket.on('error', (err) => {
    const lobbyInfo = document.getElementById('lobbyInfo');
    lobbyInfo.innerText = `Error: ${err}`;
    lobbyInfo.style.display = 'block';
    console.error('Socket.IO error:', err);
});

function displayQuestion(question) {
    console.log('Displaying question:', question); // Debug
    const quizContainer = document.getElementById('quizContainer');
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
}

function submitAnswer(answer) {
    console.log('Submitting answer:', answer); // Debug
    socket.emit('answerQuestion', { lobbyCode, answer });
}

document.getElementById('startQuizButton').addEventListener('click', startQuiz);