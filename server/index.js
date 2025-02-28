require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const lobbies = new Map(); // Stores lobbies and their players

// Middleware to serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Define a route for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const generateQuizQuestions = async (topic, numQuestions = 5, language = 'en') => {
    const prompt = `
        Generate ${numQuestions} quiz questions about ${topic} in ${language}.
        Each question should be multiple choice with 4 options (A, B, C, D) and specify the correct answer.
        Format the output as a JSON array where each item is a dictionary with:
        "question", "options", and "correct_answer".
        Example output:
        [
          {
            "question": "What is the capital of France?",
            "options": ["A) London", "B) Paris", "C) Berlin", "D) Rome"],
            "correct_answer": "B"
          },
          {
            "question": "What is 2+2?",
            "options": ["A) 3", "B) 4", "C) 5", "D) 6"],
            "correct_answer": "B"
          }
        ]
    `;

    try {
        const result = await model.generateContent(prompt);
        console.log(result.response.text());
        const rawText = result.response.text().trim();

        // Remove any leading or trailing backticks and newlines
        const cleanedText = rawText.replace(/^`{3}json\n|`{3}\n?$/g, '');

        try {
            const quizData = JSON.parse(cleanedText);
            return quizData;
        } catch (jsonError) {
            console.error("Error: Invalid JSON response:", jsonError);
            return null;
        }
    } catch (error) {
        console.error('Error generating content:', error);
        return null;
    }
};

function generateLobbyCode() {
    let code;
    do {
        code = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (lobbies.has(code));
    return code;
}

io.on('connection', async (socket) => {
    console.log('A user connected:', socket.id);

    // Create a new lobby
    socket.on('createLobby', async (hostName, topic, numQuestions, language) => {
        const lobbyCode = generateLobbyCode();
        let questions = [];

        try {
            questions = await generateQuizQuestions(topic, numQuestions, language);
        } catch (error) {
            console.error('Error generating questions:', error);
            socket.emit('error', 'Failed to generate questions');
            return;
        }

        if (!questions) {
            socket.emit('error', 'Failed to generate questions');
            return;
        }

        lobbies.set(lobbyCode, {
            host: socket.id,
            players: [{ id: socket.id, name: hostName, score: 0, timeTaken: 0, currentQuestionIndex: 0 }],
            quizStarted: false,
            questions,
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
            if (!lobby.questions || lobby.questions.length === 0) {
                socket.emit('error', 'No questions available to start the quiz');
                return;
            }
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

            // Normalize the answer for comparison
            const normalizedAnswer = answer.trim().toLowerCase();
            const normalizedCorrectAnswer = question.correct_answer.trim().toLowerCase();

            if (player && normalizedCorrectAnswer === normalizedAnswer) {
                player.score += 1;
                console.log(`Player ${player.name} answered correctly. New score: ${player.score}`);
            } else {
                console.log(`Player ${player.name} answered incorrectly. Correct answer: ${question.correct_answer}`);
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
            console.log('Leaderboard:', sortedPlayers);
        }
    }

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        for (const [lobbyCode, lobby] of lobbies.entries()) {
            const playerIndex = lobby.players.findIndex((player) => player.id === socket.id);
            if (playerIndex !== -1) {
                const leavingPlayer = lobby.players.splice(playerIndex, 1)[0];
                if (socket.id === lobby.host) {
                    // If the host disconnects, destroy the lobby
                    io.to(lobbyCode).emit('lobbyClosed');
                    lobbies.delete(lobbyCode);
                } else {
                    // Notify remaining players
                    io.to(lobbyCode).emit('playerLeft', lobby.players);
                }
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});