const socket = io();

let lobbyCode = '';
let isHost = false;

function createLobby() {
    const hostName = document.getElementById('hostName').value;
    const topic = document.getElementById('topic').value;
    const numQuestions = document.getElementById('numQuestions').value;
    const language = document.getElementById('language').value; // Get the selected language
    socket.emit('createLobby', hostName, topic, numQuestions, language);
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
    if (!isHost) {
        document.getElementById('lobbyInfo').innerText = 'Waiting for host to start the quiz';
        document.getElementById('lobby').style.display = 'none'; // Hide the join lobby section
        document.getElementById('playersList').style.display = 'none'; // Hide the players list
        document.getElementById('startQuizButton').style.display = 'none'; // Hide the start quiz button
    }
});

socket.on('quizStarted', (question) => {
    document.getElementById('lobbyInfo').innerText = 'Quiz has started!';
    document.getElementById('lobbyInfo').style.opacity = 1;
    setTimeout(() => {
        document.getElementById('lobbyInfo').style.opacity = 0;
    }, 1000);
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
    document.getElementById('leaderboardList').innerHTML = '<li>Waiting for others to finish...</li>'; // Show waiting message
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

socket.on('playerLeft', (players) => {
    document.getElementById('playersList').innerText = `Players: ${players.map(p => p.name).join(', ')}`;
});

function displayQuestion(question) {
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.innerHTML = `
        <h2>${question.question}</h2>
        <ul id="options">
            ${question.options.map(option => {
                const letter = option.split(')')[0].trim(); // Extract the letter from the option
                return `<li><button onclick="submitAnswer('${letter}')">${option}</button></li>`;
            }).join('')}
        </ul>
    `;
}

function submitAnswer(answer) {
    socket.emit('answerQuestion', lobbyCode, answer);
}

document.getElementById('startQuizButton').addEventListener('click', startQuiz);