const express = require('express')
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

global.Quiz = require('./api/models/quizModel');
const routes = require('./api/routes/quizRoutes');

mongoose.Promise = global.Promise;

mongoose.set('useFindAndModify', false);
mongoose.connect(
  `mongodb+srv://jeffreyq:${ process.env.MONGOPW }@quizy-vsn1g.mongodb.net/test?retryWrites=true&w=majority`, { useNewUrlParser: true }).then(() => console.log('DB connected')).catch(err => console.error(err));

const port = process.env.PORT || 3000;

const server = express();

server.use(cors());
server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());

routes(server);
server.listen(port);

server.use((req, res) => {
  res.status(404).send({ url: req.originalUrl + ' not found' });
});

console.log(`Server running at http://localhost:${ port }`);
