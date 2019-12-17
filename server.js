const express = require('express')
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const http = require('http');

const HOST_JOINED = "HOST_JOINED";
const HOST_STARTED_GAME = "HOST_STARTED_GAME";
const GAME_HAS_STARTED = "GAME_HAS_STARTED";
const GAME_INTRO = "GAME_INTRO";
const FETCH_INTRO = "FETCH_INTRO";
// const FETCH_GAME = "FETCH_GAME";
// const RECEIVE_GAME = "RECEIVE_GAME";
// NO LONGER REQUIRED -- TO BE PROVIDED IN FETCH GAME AND RECEIVE GAME
const FETCH_QUESTION = "FETCH_QUESTION";
const RECEIVE_QUESTION = "RECEIVE_QUESTION";
const HOST_DISCONNECTED = "HOST_DISCONNECTED";
const SHOW_PIN = "SHOW_PIN";
const UPDATE_PLAYERS_IN_LOBBY ="UPDATE_PLAYERS_IN_LOBBY";
const PLAYER_JOINED = "PLAYER_JOINED";
const PLAYER_JOINED_SUCCESSFULLY = "PLAYER_JOINED_SUCCESSFULLY";
const READY = "READY";
const RECEIVE_ANSWER_OPTIONS = "RECEIVE_ANSWER_OPTIONS";
const GAME_NOT_FOUND = "GAME_NOT_FOUND";
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

const db = `mongodb+srv://jeffreyq:${ process.env.MONGOPW }@quizy-vsn1g.mongodb.net/main?retryWrites=true&w=majority`;

mongoose.set('useFindAndModify', false);
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
  .then(() => console.log('DB connected'))
  .catch(err => console.error(err));

const port = process.env.PORT || 3000;

const app = express();

// create server instance
const server = http.createServer(app);

// create socket using the instance of the server
const io = socketIO(server, {
  pingTimeout: 60000,
});

app.use(cors());
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

  socket.on(HOST_JOINED, quizId => {
    console.log(`Host has joined the game: ${ quizId }`);
    Quiz.findById(quizId, (err, quiz) => {
      if (err) console.log(err);

      let newGame;

      if (quiz) {
        let pin = Math.floor(Math.random()*9000000) + 1000000;
        // console.log( quiz._id );
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

        socket.join(newGame.pin);

        console.log('Showing pin for the game:', newGame.pin );

        socket.emit(SHOW_PIN, {
          pin: newGame.pin
        })

      } else {

        socket.emit(QUIZ_DOES_NOT_EXIST); // TODO: add code on client side to deal with this

      }

    });

  });

  socket.on(PLAYER_JOINED, data => {

    console.log('Player attempting to join a game', data);

    let gameFound = false;

    Game.find({}, (err, games) => {
      if (err) console.log(err);

      for (let i = 0; i < games.length; i++) {

        if (parseInt(data.pin) === games[i].pin) {

          console.log('Player has successfully connected to the game', data);

          const hostId = games[i].hostId;

          newPlayer = new Player({
            hostId: hostId,
            pin: parseInt(data.pin),
            playerId: socket.id,
            nickname: data.nickname,
            answer: '',
            score: 0,
            streak: 0,
            lastCorrect: false
          })

          newPlayer.save((err, player) => {
            if (err) console.log(err);
            console.log('New player created', player);
            if (player._id) {
              socket.join(parseInt(data.pin));

              console.log( hostId );

              Player.find({ hostId: hostId }, (err, players) => {
                if (err) console.log(err);

                console.log('All players:', players);

                io.to(parseInt(data.pin)).emit(UPDATE_PLAYERS_IN_LOBBY, players);
              });
            }
          });
          gameFound = true;
        }
      }
      console.log(gameFound);
      if (!gameFound) {
        socket.emit(GAME_NOT_FOUND);
      } else {
        socket.emit(PLAYER_JOINED_SUCCESSFULLY);
      }

    })

  });

  socket.on(HOST_STARTED_GAME, data => {

    console.log('Host started game with pin:', data);
    const pin = parseInt(data);
    const filter = { hostId: socket.id, pin: pin };
    const update = { gameStatus: true };

    Game.findOneAndUpdate(filter, update).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      console.log('Host has started game');
      io.to(pin).emit(GAME_HAS_STARTED);
    })
  });

  socket.on(FETCH_INTRO, pin => {

    console.log('Fetching info for room with pin:', pin);
    Game.findOne({ hostId: socket.id, pin: pin }).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      console.log('Fetching info for this game');
      const quizId = game.quiz._id;
      const quizName = game.quiz.name;
      const numberOfQuestions = game.quiz.questions.length;

      socket.emit(GAME_INTRO, { quizName: quizName, numberOfQuestions: numberOfQuestions });

      io.to(pin).emit(READY);
    })
  });

  // socket.on(FETCH_QUESTION, pin => {
  //
  //   const filter = { hostId: socket.id, pin: parseInt(pin) };
  //   const update = { questionShow: true };
  //
  //   console.log('Filter', filter);
  //
  //   Game.findOneAndUpdate(filter, update).populate('quiz').exec((err, game) => {
  //     if (err) console.log(err);
  //
  //     console.log(game);
  //
  //     const data = {
  //       questionNumber: game.questionNumber,
  //       question: game.quiz.questions[game.questionNumber - 1],
  //       totalNumberOfQuestions: game.quiz.questions.length
  //     };
  //
  //     console.log('Sending this question:', data);
  //
  //     socket.emit(RECEIVE_QUESTION, data);
  //   })
  //
  // });

  socket.on(FETCH_QUESTION, pin => {

    Game.findOne({ hostId: socket.id, pin: parseInt(pin) }).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      console.log('Fetching info on this game:', game);

      let numberOfPlayers;

      Player.countDocuments({ hostId: socket.id, pin: parseInt(pin) }, (err, count) => {
        if (err) console.log(err);

        numberOfPlayers = count;
      })

      const data = {
        questionNumber: game.questionNumber,
        totalNumberOfQustions: game.quiz.questions.length,
        question: game.quiz.questions[game.questionNumber - 1],
        numberOfPlayers: numberOfPlayers
      }

      const playData = {
        questionNumber: game.questionNumber,
        totalNumberOfQustions: game.quiz.questions.length,
        answers: game.quiz.questions[game.questionNumber - 1].answers
      }

      socket.emit(RECEIVE_QUESTION, data);
      console.log('Fetching game data:', data);

      io.to(game.pin).emit(RECEIVE_ANSWER_OPTIONS, playData);
      console.log('Sending answer options to players:', playData);
    })


  })

  socket.on('disconnect', () => {
    console.log('User disconnected with socket id:', socket.id);

    Game.find({ hostId: socket.id }, (err, game) => {
      if (err) console.log(err);

      if (game.length !== 0) {

        Game.deleteOne({ _id: game[0]._id }, err => {
          if (err) console.log(err);

          console.log('Host has been disconnected. Game has been disconnected. Pin:', game[0].pin);

          Player.deleteMany({ hostId: game.hostId}, err => {
            if (err) console.log(err);

            io.to(game.pin).emit(HOST_DISCONNECTED);
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

                    console.log('Updated players:', players);

                    io.to(pin).emit(UPDATE_PLAYERS_IN_LOBBY, players);

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
