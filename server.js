const express = require('express')
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const http = require('http');

global.Quiz = require('./api/models/quizModel');
global.User = require('./api/models/userModel');
const quizRouter = require('./api/routes/quizRoutes');
const userRouter = require('./api/routes/userRoutes');

mongoose.Promise = global.Promise;

const db = `mongodb+srv://jeffreyq:${ process.env.MONGOPW }@quizy-vsn1g.mongodb.net/main?retryWrites=true&w=majority`;

mongoose.set('useFindAndModify', false);
mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log('DB connected'))
  .catch(err => console.error(err));

const port = process.env.PORT || 3000;

const app = express();

// create server
const server = http.createServer(app);

// create socket
const io = socketIO(server);

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/quizzes', quizRouter);

server.listen(port, () => {
  console.log(`Server listening at http://localhost:${ port }`);
});

app.use((req, res) => {
  res.status(404).send({ url: req.originalUrl + ' not found' });
});
