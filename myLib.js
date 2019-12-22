
//function database
class Database {
  constructor() {
    this.players = [];
    this.sports = [];
    this.games = [];
  }
}

class Game {
  constructor(name) {
    this.name = name;
  	this.sports = {};
  	this.players = {};
  	this.status = 'empty'; // 'empty','gameOn','finished'
    this.maxStrokes = 7;
  }
}


// Player constructor, Ei toimi suoraan classina..
function Player(name) {
	this.name = name;
	this.pointsTot = 0;
	this.position = 0;

	this.addSportPoints = function(sportName) {
		this[sportName + 'Points'] = 0;
		this[sportName + 'Score'] = 0;
		this[sportName + 'Position'] = 0;
    this[sportName + 'CurrentHole'] = 0; //Tulostaulukkoa varten
	}

	this.addSportResults = function(sportObj) {
		this.scoreList = [...sportObj.parList];
	}

	this.setPoints = function() {
    this.pointsTot = 0;
		Object.keys(G_game.sports).forEach((sportName,ind,arr)=>{
      if (G_game.sports[sportName].status == 'notStarted') {

      }
      else {
        // Jos pistevektori on lyhyempi kuin pelaajien määrä, anna minimipisteet
  			if(this[sportName + 'Position'] > G_points.length) {
  				this[sportName + 'Points'] = G_points[G_points.length-1];
  				this.pointsTot +=  this[sportName + 'Points'];
  			}
  			else {
  				this[sportName + 'Points'] = G_points[this[sportName + 'Position']-1];
  				this.pointsTot +=  this[sportName + 'Points'];
  			}
      }
		}, this) // HUOM! Thissin käyttö

	}
}



class MyTeam {
  constructor() {
  	this.players = [];
  	this.status = "empty"; // Pitää kirjaa missä näytössä mennään
  	this.currentHole = 1;
  	this.gameName = "empty";
  	this.currentSport = "empty";
  }
}

class Sport {
  constructor(sportName,parNr=0,parList=[0]) {
    this.name = sportName;
    this.status = "notStarted"; //"notStarted", "gameOn", "finished"
    this.parNr = parNr; //Reikien määrä
    this.parList = parList; //par-vektori
    this.maxSetting = G_maxStrokes;
    this.maxScore = parList.map(x => x + G_maxStrokes); //Maksimilyönnit (vektori)
    this.players = {};
    this.totalPar = [...parList].reduce( (a,b) => a+b ,0); //Ihannetulos
  }
  setMaxScore() {
    this.maxScore = this.parList.map(x => x + G_game.maxStrokes);
    console.log("new maxScores:");
    console.log(this.maxScore);
  }
}
