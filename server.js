const express = require('express')
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const http = require('http');

global.Quiz = require('./api/models/quizModel');
global.User = require('./api/models/userModel');
global.Game = require('./api/models/gameModel');
global.Player = require('./api/models/playerModel');
const quizRouter = require('./api/routes/quizRoutes');
const userRouter = require('./api/routes/userRoutes');
const gameRouter = require('./api/routes/gameRoutes');
const playerRouter = require('./api/routes/playerRoutes');

const Players = require('./api/games/players');
let players = new Players();

mongoose.Promise = global.Promise;

const db = `mongodb+srv://jeffreyq:${ process.env.MONGOPW }@quizy-vsn1g.mongodb.net/main?retryWrites=true&w=majority`;

mongoose.set('useFindAndModify', false);
mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log('DB connected'))
  .catch(err => console.error(err));

const port = process.env.PORT || 3000;

const app = express();

// create server instance
const server = http.createServer(app);

// create socket using the instance of the server
const io = socketIO(server);

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
  console.log('User connected')

  socket.on('hostJoin', quizId => {
    console.log( quizId );
    Quiz.findById(quizId, (err, quiz) => {
      if (err) console.log(err);

      let newGame;

      if (quiz) {
        let pin = Math.floor(Math.random()*9000000) + 1000000;
        console.log( quiz._id );
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
          console.log( game );
        })

        socket.join(newGame.pin);

        console.log( newGame.pin );

        socket.emit('showPin', {
          pin: newGame.pin
        })

      } else {

        socket.emit('quizDoesNotExist'); // TODO: add code on client side to deal with this

      }

    });

  });

  socket.on('playerJoin', data => {

    console.log( data );

    let gameFound = false;

    Game.find({}, (err, games) => {
      if (err) console.log(err);

      for (let i = 0; i < games.length; i++) {

        if (parseInt(data.pin) === games[i].pin) {

          console.log('Player has connected');

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
            console.log( player );
            if (player._id) {
              socket.join(data.pin);

              console.log( hostId );

              Player.find({ hostId: hostId }, (err, players) => {
                if (err) console.log(err);

                console.log( players );

                io.to(data.pin).emit('updatePlayersInLobby', players);

                gameFound = true;
              });
            }
          });
        }
      }

      if (!gameFound) {
        socket.emit('gameNotFound');
      }

    })

  });

  socket.on('disconnect', () => {
    console.log('User disconnected')
  })
})
