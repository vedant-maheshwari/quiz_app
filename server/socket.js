module.exports = (io) => {
    const lobbies = new Map(); // Stores lobbies and their players

    function generateLobbyCode() {
        let code;
        do {
            code = Math.random().toString(36).substring(2, 8).toUpperCase();
        } while (lobbies.has(code));
        return code;
    }

    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Create a new lobby
        socket.on('createLobby', (hostName) => {
            const lobbyCode = generateLobbyCode();
            lobbies.set(lobbyCode, {
                host: socket.id,
                players: [{ id: socket.id, name: hostName, score: 0, timeTaken: 0, currentQuestionIndex: 0 }],
                quizStarted: false,
                questions: [
                    { question: "What is 2 + 2?", answer: "4", options: ["2", "3", "4", "5"] },
                    { question: "What is the capital of France?", answer: "Paris", options: ["London", "Paris", "Berlin", "Madrid"] }
                ],
                startTime: Date.now()
            });
            socket.join(lobbyCode);
            socket.emit('lobbyCreated', lobbyCode);
        });

        // Join an existing lobby
        socket.on('joinLobby', (lobbyCode, playerName) => {
            const lobby = lobbies.get(lobbyCode);
            if (lobby) {
                lobby.players.push({ id: socket.id, name: playerName, score: 0, timeTaken: 0, currentQuestionIndex: 0 });
                socket.join(lobbyCode);
                io.to(lobbyCode).emit('playerJoined', lobby.players);
            } else {
                socket.emit('lobbyNotFound');
            }
        });

        // Start the quiz
        socket.on('startQuiz', (lobbyCode) => {
            const lobby = lobbies.get(lobbyCode);
            if (lobby && socket.id === lobby.host) {
                lobby.quizStarted = true;
                io.to(lobbyCode).emit('quizStarted', lobby.questions[0]);
            }
        });

        // Answer a question
        socket.on('answerQuestion', (lobbyCode, answer) => {
            const lobby = lobbies.get(lobbyCode);
            if (lobby && lobby.quizStarted) {
                const player = lobby.players.find(p => p.id === socket.id);
                const question = lobby.questions[player.currentQuestionIndex];
                const timeTaken = Date.now() - lobby.startTime;

                if (player && question.answer === answer) {
                    player.score += 1;
                }
                player.timeTaken += timeTaken;

                if (player.currentQuestionIndex < lobby.questions.length - 1) {
                    player.currentQuestionIndex += 1;
                    socket.emit('nextQuestion', lobby.questions[player.currentQuestionIndex]);
                } else {
                    socket.emit('quizEnded');
                    player.completed = true;
                    checkIfAllCompleted(lobbyCode);
                }
            }
        });

        // Check if all players have completed the quiz
        function checkIfAllCompleted(lobbyCode) {
            const lobby = lobbies.get(lobbyCode);
            const allCompleted = lobby.players.every(player => player.completed);

            if (allCompleted) {
                const sortedPlayers = lobby.players.sort((a, b) => b.score - a.score || a.timeTaken - b.timeTaken);
                io.to(lobbyCode).emit('leaderboard', sortedPlayers);
            }
        }

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('A user disconnected:', socket.id);
            for (const [lobbyCode, lobby] of lobbies.entries()) {
                const playerIndex = lobby.players.findIndex((player) => player.id === socket.id);
                if (playerIndex !== -1) {
                    lobby.players.splice(playerIndex, 1);
                    if (lobby.players.length > 0) {
                        if (socket.id === lobby.host) {
                            lobby.host = lobby.players[0].id;
                            io.to(lobbyCode).emit('newHost', lobby.players[0].name);
                        }
                        io.to(lobbyCode).emit('playerLeft', lobby.players);
                    } else {
                        lobbies.delete(lobbyCode);
                    }
                }
            }
        });
    });
};