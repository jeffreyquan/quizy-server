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
const FETCH_QUESTION = "FETCH_QUESTION";
const RECEIVE_QUESTION = "RECEIVE_QUESTION";
const HOST_DISCONNECTED = "HOST_DISCONNECTED";
const SHOW_PIN = "SHOW_PIN";
const UPDATE_PLAYERS_IN_LOBBY ="UPDATE_PLAYERS_IN_LOBBY";
const PLAYER_JOINED = "PLAYER_JOINED";
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
          questionShow: false,
          questionCount: 1
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
            playerId: socket.id,
            nickname: data.nickname,
            answer: 'e',
            score: 0,
            streak: 0,
            lastCorrect: false
          })

          newPlayer.save((err, player) => {
            if (err) console.log(err);
            console.log('New player created', player);
            if (player._id) {
              socket.join(data.pin);

              console.log( hostId );

              Player.find({ hostId: hostId }, (err, players) => {
                if (err) console.log(err);

                console.log('All players:', players);

                io.to(data.pin).emit(UPDATE_PLAYERS_IN_LOBBY, players);
              });
            }
          });
          gameFound = true;
        }
      }
      console.log(gameFound);
      if (!gameFound) {
        socket.emit(GAME_NOT_FOUND);
      }

    })

  });

  socket.on(HOST_STARTED_GAME, pin => {

    const filter = { hostId: socket.id, pin: pin };
    const update = { gameStatus: true };

    Game.findOneAndUpdate(filter, update).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      // const quizId = game.quiz._id;
      // const quizName = game.quiz.name;
      // const numberOfQuestions = game.quiz.questions.length;
      //
      // io.to(pin).emit(GAME_INTRO, { quizName: quizName, numberOfQuestions: numberOfQuestion });
      io.to(pin).emit(GAME_HAS_STARTED);

    })
  });

  socket.on(FETCH_INTRO, pin => {

    console.log(pin);
    Game.findOne({ hostId: socket.id, pin: pin }).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      console.log('Fetching info from this game:', game);
      const quizId = game.quiz._id;
      const quizName = game.quiz.name;
      const numberOfQuestions = game.quiz.questions.length;

      socket.emit(GAME_INTRO, { quizName: quizName, numberOfQuestions: numberOfQuestions });
    })
  });

  socket.on(FETCH_QUESTION, pin => {

    const filter = { hostId: socket.id, pin: pin };
    const update = { questionShow: true };

    let game = Game.findOneAndUpdate(filter, update).populate('quiz').exec((err, game) => {
      if (err) console.log(err);

      const data = {
        questionNumber: game.questionCount,
        question: game.quiz.questions[questionNumber - 1],
        totalNumberOfQuestions: game.quiz.questions.length
      };

      socket.emit(RECEIVE_QUESTION, data);
    })

  });

  socket.on('disconnect', () => {
    console.log('User disconnected with socket id:', socket.id);

    Game.find({ hostId: socket.id }, (err, game) => {
      if (err) console.log(err);

      if (game.length !== 0) {

        const pin = game.pin;

        Game.deleteOne({ _id: game._id }, err => {
          if (err) console.log(err);

          console.log('Game has been disconnected. Pin:', pin);

          Player.deleteMany({ hostId: game.hostId}, err => {
            if (err) console.log(err);

            io.to(game.pin).emit(HOST_DISCONNECTED);
          })
        })

        socket.leave(pin);

      } else {

        Player.findOne({ playerId: socket.id }, (err, player) => {
          if (err) console.log(err);

          if (player) {

            const hostId = player.hostId;

            Game.findOne({ hostId: hostId }, (err, game) => {
              if (err) console.log(err);

              const pin = game.pin;

              if (!game.gameStatus) {

                Player.deleteOne({ playerId: socket.id }, err => {
                  if (err) console.log(err);

                  Player.find({ hostId: hostId }, (err, players) => {
                    if (err) console.log(err);

                    console.log('Updated players:', players);

                    io.to(pin).emit(UPDATE_PLAYERS_IN_LOBBY, players);

                    socket.leave(pin);
                  })
                })
              }
            })
          }
        })
      }
    })
  })
})
