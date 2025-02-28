const socket = io();

let lobbyCode = '';
let isHost = false;

function createLobby() {
    const hostName = document.getElementById('hostName').value;
    socket.emit('createLobby', hostName);
}

function joinLobby() {
    lobbyCode = document.getElementById('lobbyCode').value;
    const playerName = document.getElementById('playerName').value;
    socket.emit('joinLobby', lobbyCode, playerName);
}

function startQuiz() {
    socket.emit('startQuiz', lobbyCode);
}

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('lobbyCreated', (code) => {
    lobbyCode = code;
    isHost = true;
    document.getElementById('lobbyInfo').innerText = `Lobby created: ${code}`;
    document.getElementById('lobby').style.display = 'none'; // Hide the lobby input fields
    document.getElementById('playersList').style.display = 'block'; // Show the players list
    document.getElementById('startQuizButton').style.display = 'block'; // Show the start quiz button
});

socket.on('playerJoined', (players) => {
    document.getElementById('lobbyInfo').innerText = `Lobby: ${lobbyCode}`;
    document.getElementById('playersList').innerText = `Players: ${players.map(p => p.name).join(', ')}`;
});

socket.on('quizStarted', (question) => {
    document.getElementById('lobbyInfo').innerText = 'Quiz has started!';
    document.getElementById('playersList').style.display = 'none'; // Hide the players list
    document.getElementById('startQuizButton').style.display = 'none'; // Hide the start quiz button
    document.getElementById('quizContainer').style.display = 'block'; // Show the quiz container
    displayQuestion(question);
});

socket.on('nextQuestion', (question) => {
    displayQuestion(question);
});

socket.on('quizEnded', () => {
    document.getElementById('quizContainer').style.display = 'none'; // Hide the quiz container
    document.getElementById('leaderboard').style.display = 'block'; // Show the leaderboard
});

socket.on('leaderboard', (players) => {
    const leaderboard = document.getElementById('leaderboardList');
    leaderboard.innerHTML = '';
    players.forEach((player, index) => {
        const listItem = document.createElement('li');
        listItem.innerText = `${index + 1}. ${player.name} - Score: ${player.score}, Time: ${player.timeTaken}ms`;
        leaderboard.appendChild(listItem);
    });
});

function displayQuestion(question) {
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.innerHTML = `
        <h2>${question.question}</h2>
        <ul>
            ${question.options.map(option => `<li><button onclick="submitAnswer('${option}')">${option}</button></li>`).join('')}
        </ul>
    `;
}

function submitAnswer(answer) {
    socket.emit('answerQuestion', lobbyCode, answer);
}

document.getElementById('startQuizButton').addEventListener('click', startQuiz);