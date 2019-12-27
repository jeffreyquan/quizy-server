const express = require('express')
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const http = require('http');

// const FETCH_GAME = "FETCH_GAME";
// const RECEIVE_GAME = "RECEIVE_GAME";
// NO LONGER REQUIRED -- TO BE PROVIDED IN FETCH GAME AND RECEIVE GAME
const ANSWER_RESULT = "ANSWER_RESULT"; // DO WE NEED THIS

const HOST_DISCONNECTED = "HOST_DISCONNECTED"; // TODO: ADDRESS THIS ON CLIENT SIDE
const WAITING_FOR_START = "WAITING_FOR_START"; // TODO: DO WE NEED THIS?
const QUIZ_DOES_NOT_EXIST = "QUIZ_DOES_NOT_EXIST" // TODO: ADDRESS THIS ON CLIENT SIDE

global.Quiz = require('./api/models/quizModel');
global.User = require('./api/models/userModel');
global.Game = require('./api/models/gameModel');
global.Player = require('./api/models/playerModel');
const quizRouter = require('./api/routes/quizRoutes');
const userRouter = require('./api/routes/userRoutes');
const gameRouter = require('./api/routes/gameRoutes');
const playerRouter = require('./api/routes/playerRoutes');

mongoose.Promise = global.Promise;

const db = process.env.MONGODB_URI;

mongoose.set('useFindAndModify', false);
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
  .then(() => console.log('DB connected'))
  .catch(err => console.error(err));

const port = process.env.PORT || 3000;

const app = express();

const server = http.createServer(app);

const io = socketIO(server, {
  pingTimeout: 60000
});

let whitelist = ['https://jeffreyquan.github.io', 'http://localhost:3333']
var corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
};

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/quizzes', quizRouter);
app.use('/games', gameRouter);
app.use('/players', gameRouter);

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${ port }`);
});

app.use((req, res) => {
  res.status(404).send({ url: req.originalUrl + ' not found' });
});

io.on('connection', socket => {
  console.log('User connected with socket id:', socket.id);

  socket.on("HOST_JOINED", quizId => {
    console.log(`Host has joined the game: ${ quizId }`);
    Quiz.findById(quizId, (err, quiz) => {
      if (err) console.log(err);

      let newGame;

      if (quiz) {
        let pin = Math.floor(Math.random()*9000000) + 1000000;

        newGame = new Game({
          hostId: socket.id,
          pin: pin,
          quiz: quiz,
          gameStatus: false,
          playersAnswered: 0,
          questionNumber: 1,
          questionStatus: false
        })

        newGame.save((err, game) => {
          if (err) console.log(err);
          console.log('Game created', game );
        })

        socket.join(pin);

        console.log('Showing pin for the game:', pin );

        socket.emit("SHOW_PIN", {
          pin: newGame.pin
        })

      } else {

        socket.emit("QUIZ_DOES_NOT_EXIST"); // TODO: add code on client side to deal with this

      }

    });

  });

  socket.on("PLAYER_JOINED", data => {

    console.log('Player attempting to join a game', data);

    let pin = parseInt(data.pin);
    let nickname = data.nickname;

    let gameFound = false;
    let nicknameTaken = false;

    Game.findOne({ pin: pin }, (err, game) => {
      if (err) console.log(err);

      if (game) {

        console.log('Player has successfully located the game', data);

        const hostId = game.hostId;

        Player.findOne({ nickname: nickname }, (err, player) => {
          if (err) console.log(err);

          if (player.length === 1) {
            socket.emit("NICKNAME_TAKEN");
            nicknameTaken = true;
            return
          }

          if (!nicknameTaken) {

            newPlayer = new Player({
              hostId: hostId,
              pin: pin,
              playerId: socket.id,
              nickname: nickname,
              answer: null,
              score: 0,
              streak: 0,
              rank: 0,
              lastCorrect: false,
              totalCorrect: 0
            })

            newPlayer.save((err, player) => {
              if (err) console.log(err);

              console.log('New player created', player);
              if (player._id) {
                socket.join(pin);

                console.log( hostId );

                socket.emit("PLAYER_JOINED_SUCCESSFULLY", { nickname: player.nickname, pin: data.pin });

                Player.find({ hostId: hostId }, (err, players) => {
                  if (err) console.log(err);

                  console.log('All players:', players);
                  const playersData = {
                    players: players,
                    playersCount: players.length
                  }

                  io.to(pin).emit("UPDATE_PLAYERS_IN_LOBBY", playersData);
                });
              }
            });
          }
        })
        gameFound = true;
      }

      console.log(gameFound);
      if (!gameFound) {
        socket.emit("GAME_NOT_FOUND");
      }

    })
  });

  // socket.on(WAITING_FOR_START, () => {
  //   Player
  // })

  socket.on("HOST_STARTED_GAME", data => {

    console.log('Host started game with pin:', data);
    const pin = parseInt(data);
    const filter = { hostId: socket.id, pin: pin };
    const update = { gameStatus: true, questionStatus: true };

    Game.findOneAndUpdate(filter, update, { new: true }).exec((err, game) => {
      if (err) console.log(err);

      console.log('Host has started game');
      io.to(pin).emit("GAME_HAS_STARTED");
    })
  });

  socket.on("FETCH_INTRO", pin => {

    console.log('Fetching info for room with pin:', pin);
    Game.findOne({ hostId: socket.id, pin: pin }).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      console.log('Fetching info for this game');
      const quizId = game.quiz._id;
      const quizName = game.quiz.name;
      const totalNumberOfQuestions = game.quiz.questions.length;

      socket.emit("GAME_INTRO", { quizName: quizName, totalNumberOfQuestions: totalNumberOfQuestions });

      io.to(game.pin).emit("READY");
      console.log('Ready message has been emitted -- game is about to start');
    })
  });

  socket.on("FETCH_NUMBER_OF_QUESTIONS", pin => {

    Game.findOne({ pin: parseInt(pin) }).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      const numberOfQuestions = game.quiz.questions.length;

      socket.emit("RECEIVE_NUMBER_OF_QUESTIONS", numberOfQuestions);
    })

  })

  socket.on("FETCH_QUESTION", data => {

    const pin = parseInt(data);

    Promise.all([
      Game.findOne({ hostId: socket.id, pin: pin }).populate('quiz').exec(),
      Player.countDocuments({ hostId: socket.id, pin: pin }).exec()
    ]).then(([game, count]) => {

      const numberOfPlayers = count;

      const data = {
        quizName: game.quiz.name,
        questionNumber: game.questionNumber,
        totalNumberOfQuestions: game.quiz.questions.length,
        question: game.quiz.questions[game.questionNumber - 1],
        numberOfPlayers: numberOfPlayers
      }

      const playData = {
        questionNumber: game.questionNumber,
        totalNumberOfQuestions: game.quiz.questions.length,
        answers: game.quiz.questions[game.questionNumber - 1].answers
      }

      socket.emit("RECEIVE_QUESTION", data);
      console.log('Fetching game data:', data);

      io.to(game.pin).emit("RECEIVE_ANSWER_OPTIONS", playData);
      console.log('Sending answer options to players: ', playData);
    })
  });

  socket.on("ANSWER_SUBMITTED", data => {

    const { answer, pin } = data;

    const filter = { playerId: socket.id, pin: pin };

    console.log(`Player ${ socket.id } has submitted answer ${ answer } to game ${ pin }.`);

    Promise.all([
      Player.findOne(filter).exec(),
      Player.countDocuments({ pin: pin }).exec(),
      Game.findOne({ pin: pin }).populate('quiz').exec()
    ]).then(([player, count, game]) => {

      let numberOfPlayers = count;
      console.log('Displaying game', game);
      const correctAnswer = game.quiz.questions[game.questionNumber - 1].correct;

      if (game.questionStatus) {

        let score;
        let lastCorrect;
        let streak;
        let totalCorrect;

        if (data.answer === correctAnswer) {
          score = player.score + 200;
          io.to(game.pin).emit("FETCH_TIME", socket.id);
          // socket.emit(ANSWER_RESULT, true); // MAYBE NEED TO MOVE THIS TO INCLUDE STREAK, ETC.
          lastCorrect = true;
          streak = player.streak + 1;
          totalCorrect = player.totalCorrect + 1;
        } else {
          score = player.score;
          lastCorrect = false;
          streak = 0;
          totalCorrect = player.totalCorrect;
          // socket.emit(ANSWER_RESULT, false); // PROBABLY DON'T NEED THIS
        }

        const update = { answer: answer, score: score, lastCorrect: lastCorrect, streak: streak, totalCorrect: totalCorrect };
        console.log('Update to player', update);

        const playersAnswered = game.playersAnswered + 1;

        Promise.all([
          Player.findOneAndUpdate(filter, update, { new: true }).exec(),
          Game.findOneAndUpdate({ _id: game._id }, { playersAnswered: playersAnswered }, { new: true }).exec()
        ]).then(([p, g]) => {

          console.log('Player answer successfully submitted.');
          console.log('Updated player: ', p);

          console.log('Updating players answered to:', playersAnswered);

          console.log('Updated game:', g);
          console.log('Updated number of players who answered.');
          io.to(g.pin).emit("UPDATE_PLAYERS_ANSWERED", playersAnswered);


          console.log('Game is showing players answered: ', g.playersAnswered, 'Total number of players count:', numberOfPlayers);

          if (g.playersAnswered === numberOfPlayers) {

            Promise.all([
              Game.findOneAndUpdate({ _id: game._id }, { questionStatus: false }, { new: true }).exec(),
              Player.find({ pin: pin })
            ]).then(([game, players]) => {
              console.log('All players have answered.');


              let answeredA = 0;
              let answeredB = 0;
              let answeredC = 0;
              let answeredD = 0;

              console.log('Fetching all players who have answered: ', players);

              for (let i = 0; i < players.length; i++) {
                if (players[i].answer === 'a') {
                  answeredA += 1;
                } else if (players[i].answer === 'b') {
                  answeredB += 1;
                } else if (players[i].answer === 'c') {
                  answeredC += 1;
                } else if (players[i].answer === 'd') {
                  answeredD += 1;
                }
              }

              const data = {
                answeredA: answeredA,
                answeredB: answeredB,
                answeredC: answeredC,
                answeredD: answeredD,
                correctAnswer: correctAnswer
              }

              io.to(game.pin).emit("QUESTION_RESULT", data);

            })
          }
        })
      }
    });
  });

  socket.on("TIME", data => {
    const { pin, playerId, time } = data;
    const filter = { playerId: playerId, pin: parseInt(pin) };

    let score;

    Player.findOne(filter, (err, player) => {
      if (err) console.log(err);

      score = player.score + time * 115;

      const update = { score: score };

      Player.findOneAndUpdate(filter, update, { new: true }, (err, p) => {
        if (err) console.log(err);

        console.log('Player score successfully updated with including time points.');
        console.log('New score:', p.score);
      })
    })
  });

  socket.on("QUESTION_END", data => {

    const pin = parseInt(data);

    const filter = { hostId: socket.id, pin: pin };
    const update = { questionStatus: false };
    const filterPlayers = { hostId: socket.id, pin: pin, answer: null };
    const updatePlayers = { lastCorrect: false, streak: 0 };

    Player.updateMany(filterPlayers, updatePlayers, (err, players) => {
      if (err) console.log(err);

      console.log(`'Question has ended. Update to those who haven't answered. Matches ${ players.n }, updated ${ players.nModified }`);
    });

    Game.findOneAndUpdate(filter, update, { new: true }).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      console.log('Question has ended.');

      let correctAnswer = game.quiz.questions[game.questionNumber - 1].correct;

      Player.find(filter, (err, players) => {
        if (err) console.log(err);

        let answeredA = 0;
        let answeredB = 0;
        let answeredC = 0;
        let answeredD = 0;

        for (let i = 0; i < players.length; i++) {
          if (players[i].answer === 'a') {
            answeredA += 1;
          } else if (players[i].answer === 'b') {
            answeredB += 1;
          } else if (players[i].answer === 'c') {
            answeredC += 1;
          } else if (players[i].answer === 'd') {
            answeredD += 1;
          }
        }

        const info = {
          answeredA: answeredA,
          answeredB: answeredB,
          answeredC: answeredC,
          answeredD: answeredD,
          correctAnswer: correctAnswer
        }

        console.log('Time is up, here are the results: ', info);

        io.to(game.pin).emit("QUESTION_RESULT", info);
      })
    })

  });

  socket.on("FETCH_SCORE", info => {
    const { nickname, pin } = info;
    console.log(`Player ${ nickname } fetching score for game with pin ${ pin }`);
    const filter = { playerId: socket.id, pin: parseInt(pin) };
    Player.findOne(filter, (err, player) => {
      if (err) console.log(err);

      const hostId = player.hostId;
      const playerScore = player.score;

      Player.find({ hostId: hostId, pin: pin }, (err, players) => {
        if (err) console.log(err);

        let scores = [];
        for (let i = 0; i < players.length; i++) {
          scores.push(players[i].score);
        }

        const sortedScores = scores.sort((a, b) => b - a);
        const rank = sortedScores.indexOf(playerScore) + 1;

        const update = { rank: rank };

        Player.findOneAndUpdate(filter, update, { new: true }).exec((err, p) => {
          if (err) console.log(err);

          console.log('Before sending results to player: ', p);
          const data = {
            score: p.score,
            rank: p.rank,
            streak: p.streak,
            lastCorrect: p.lastCorrect
          }

          socket.emit("PLAYER_RESULTS", data);

          console.log('Sending results to player:', data);
        })
      })
    });
  });

  socket.on("FETCH_SCOREBOARD", data => {

    const { pin } = data;
    const hostId = socket.id;
    console.log('Attemping to fetch scoreboard: ', data);

    Player.find({ hostId: hostId, pin: pin }, (err, players) => {
      if (err) console.log(err);

      let playerScores = [];
      for (let i = 0; i < players.length; i++) {
        const temp = {
          nickname: players[i].nickname,
          score: players[i].score
        }
        playerScores.push(temp);
      }

      const sortedPlayerScores = playerScores.filter(({ score }) => score !== null ).sort((x, y) => y.score - x.score).map((x, i) => Object.assign({ rank: i + 1}, x));

      let rankedPlayers;

      if (sortedPlayerScores.length <= 5) {
        rankedPlayers = sortedPlayerScores;
      } else {
        rankedPlayers = sortedPlayerScores.slice(0, 5);
      }

      socket.emit("RECEIVE_SCOREBOARD", rankedPlayers);
      console.log('Sending scoreboard: ', rankedPlayers);
    });
  });

  socket.on("FETCH_NEXT_QUESTION", data => {

    console.log('Fetching next question for game: ', data);
    const { pin, questionNumber } = data;
    const filter = { hostId: socket.id, pin: parseInt(pin) };
    const updatePlayer = { answer: null, lastCorrect: false };

    Player.updateMany(filter, updatePlayer, (err, players) => {
      if (err) console.log(err);

      console.log('Updated players: ', players);
      console.log(`Number of matches ${ players.n } and number of player updated ${ players.nModified }`);
    });

    console.log('Next question for game: ', filter);
    const update = { questionNumber: questionNumber, questionStatus: true, playersAnswered: 0 }

    Game.findOneAndUpdate(filter, update, { new: true }).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      console.log('Attempting to fetch the next question.');

      Player.countDocuments({ hostId: socket.id, pin: parseInt(pin) }, (err, count) => {
        if (err) console.log(err);

        console.log('Next question -- number of players: ', count);
        let numberOfPlayers = count;

        let nextQuestionHost;
        let nextQuestionPlayer;
        const numberOfQuestions = game.quiz.questions.length;

        if (questionNumber <= numberOfQuestions) {

          const nextQuestionHost = {
            questionNumber: game.questionNumber,
            question: game.quiz.questions[questionNumber - 1],
            numberOfPlayers: numberOfPlayers
          }

          const nextQuestionPlayer = {
            questionNumber: game.questionNumber,
            totalNumberOfQuestions: numberOfQuestions,
            answers: game.quiz.questions[game.questionNumber - 1].answers
          }

          socket.emit("NEXT_QUESTION", nextQuestionHost);
          console.log('Sending next question to host:', nextQuestionHost);

          io.to(game.pin).emit("RECEIVE_NEXT_ANSWER_OPTIONS", nextQuestionPlayer);
          console.log('Sending next answer options to players: ', nextQuestionPlayer);

        } else {

          Game.findOneAndUpdate(filter, { gameStatus: false }, { new: true }).populate('quiz').exec((err, game) => {
            if (err) console.log(err);

            console.log('Game is over now.');

            Player.find(filter, (err, players) => {
              if (err) console.log(err);

              let playerScores = [];
              for (let i = 0; i < players.length; i++) {
                const temp = {
                  nickname: players[i].nickname,
                  score: players[i].score,
                  totalCorrect: players[i].totalCorrect
                }
                playerScores.push(temp);
              }

              const sortedPlayerScores = playerScores.filter(({ score }) => score !== null ).sort((x, y) => y.score - x.score).map((x, i) => Object.assign({ rank: i + 1}, x));

              let finalRankings;

              if (sortedPlayerScores.length <= 3) {
                finalRankings = sortedPlayerScores;
              } else {
                finalRankings = sortedPlayerScores.slice(0, 3);
              }

              io.to(game.pin).emit("GAME_OVER", finalRankings);
            })
          })
        }
      })
    })
  });

  socket.on("NEXT", pin => {
    io.to(pin).emit("GO_TO_NEXT");
  })

  socket.on("PLAYER_RANK", pin => {

    Player.findOne({ playerId: socket.id, pin: parseInt(pin) }, (err, player) => {
      if (err) console.log(err);

      const data = {
        score: player.score,
        totalCorrect: player.totalCorrect,
        rank: player.rank
      }
      console.log('Displaying the final score of player:', data);

      socket.emit("FINAL_RANK", data);
    })
  })

  socket.on("FINISH_GAME", pin => {
    io.to(pin).emit("FINAL");
  })

  socket.on('disconnect', () => {
    console.log('User disconnected with socket id:', socket.id);

    Game.find({ hostId: socket.id }, (err, game) => {
      if (err) console.log(err);

      if (game.length !== 0) {

        Game.deleteOne({ _id: game[0]._id }, err => {
          if (err) console.log(err);

          console.log('Host has been disconnected. Game has been disconnected. Pin:', game[0].pin);

          Player.deleteMany({ hostId: game.hostId }, err => {
            if (err) console.log(err);

            io.to(game.pin).emit("HOST_DISCONNECTED");
          })
        })

        socket.leave(game.pin);

      } else {

        Player.findOne({ playerId: socket.id }, (err, player) => {
          if (err) console.log(err);

          if (player) {

            console.log('Player', player);

            Player.deleteOne({ playerId: socket.id }, err => {
              if (err) console.log(err);

              console.log('Player has disconnected.');
            })

            const hostId = player.hostId;

            Game.findOne({ hostId: hostId }, (err, game) => {
              if (err) console.log(err);

              if (game) {
                const pin = game.pin;

                console.log('pin', pin);

                if (!game.gameStatus) {

                  Player.find({ hostId: hostId }, (err, players) => {
                    if (err) console.log(err);

                    const playersData = {
                      players: players,
                      playersCount: players.length
                    }

                    console.log('Updated players in lobby', playersData);

                    io.to(pin).emit("UPDATE_PLAYERS_IN_LOBBY", playersData);

                    socket.leave(pin);
                  })

                } else if (game.gameStatus) {

                  socket.leave(pin);

                }
              }
            })
          }
        })
      }
    })
  })
})
