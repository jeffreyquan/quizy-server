class Games {
  constructor() {
    this.games = [];
  }

  fetchGame(hostId) {
    return _.where(this.games, { hostId: hostId })[0];
  }

  newGame(hostId, pin, gameStatus, gameData) {
    let game = { hostId, pin, gameStatus, gameData };
    this.games.push(game);
    return game;
  }

  removeGame(hostId) {
    let game = this.fetchGame(hostId);
    this.games = this.games.filter((game) => game.hostId !== hostId);
    return game;
  }
}

module.exports = Games;
