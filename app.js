// Initialize Firebase

//Järjestys:
// create Empty G_game & G_database & G_myTeam->
//ReDirect sign in (Login) ->
//getLocaleStorage -> (Init G_game if data available)
//loadFirebaseInitialData -> (Load G_database from cloud)
//initGame -> (update G_game from G_database and select UI to show based on G_myTeam.status)

//Firebase config
let config = {
  apiKey: "AIzaSyAEaRb-PxgqlQKR3w94m60SahLZW8Y5CUo",
  authDomain: "triplagolf.firebaseapp.com",
  databaseURL: "https://triplagolf.firebaseio.com",
  projectId: "triplagolf",
  storageBucket: "triplagolf.appspot.com",
  messagingSenderId: "480785382183"
};

firebase.initializeApp(config);
const firestore = firebase.firestore();
const settings = {/* your settings... */ timestampsInSnapshots: true};
firestore.settings(settings);

window.onload = function() {
 initApp();
};
//window.onpagehide = function() {
  //setLocaleStorage();
//};

//Google sign in/out
function toggleSignIn() {
  if (!firebase.auth().currentUser) {
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/plus.login');
    firebase.auth().signInWithRedirect(provider);
  } else {
    firebase.auth().signOut();
  }
  document.getElementById('quickstart-sign-in').disabled = true;
  document.getElementById('quickstart-sign-out').disabled = true;
}
function initApp() {
  firebase.auth().getRedirectResult().then(function(result) {
    console.log("Trying to login..");
    if (result.credential) {
      var token = result.credential.accessToken;
    }
    var user = result.user;
  }).catch(function(error) {
    var errorCode = error.code;
    var errorMessage = error.message;
    var email = error.email;
    var credential = error.credential;
    if (errorCode === 'auth/account-exists-with-different-credential') {
      alert('You have already signed up with a different auth provider for that email.');
    } else {
      console.error(error);
    }
  });

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      //console.log(user);
      var displayName = user.displayName;
      var email = user.email;
      console.log('user: '+email+" signed in");
      var photoURL = user.photoURL;
      var uid = user.uid;
      document.getElementById('quickstart-sign-in').style.display = "none";
      showNavBar();
      getLocaleStorage();
      document.getElementById('quickstart-sign-out').disabled = false;
      // Save login to info to cloud
      firestore.collection("logins").doc(uid).set({
      displayName: displayName,
      email: email,
      photoURL: photoURL
      })
      .then(function() {
          console.log("Login info successfully written to cloud!");
      })
      .catch(function(error) {
          console.error("Error writing document: ", error);
      });


    } else {
      // User is signed out.
      console.log('user is signed out');
      hideNavBar();
      $("#gameAppDiv").empty();
      document.getElementById('quickstart-sign-in').style.display = "block";
      document.getElementById('quickstart-sign-in').textContent = 'Kirjaudu sisään google-tunnuksilla';
    }
    document.getElementById('quickstart-sign-in').disabled = false;
  });

  document.getElementById('quickstart-sign-in').addEventListener('click', toggleSignIn, false);

}


//cloud REFS:
let collectionRefGames = firestore.collection("games");
let collectionRefPlayers = firestore.collection("players");
let collectionRefSports = firestore.collection("sports");
let collectionRefLogins = firestore.collection("logins");

let G_database = new Database; //Kaikki data kaikista peleistä ja pelaajista
let G_game = new Game("empty"); //Yksi ladattu peli, päivitys pilveen/pilvestä
let G_myTeam = new MyTeam; //Pidetään kirjaa ketä on tässä pelissä mukana (vektori pelaajien nimistä)

let G_points = [14, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

let G_maxStrokes = 7;

// Hakee G_myTeamin localesta, alustaa G_gamen pelaaja ja laji objekteilla, muu data haetaan pilvestä
// Kutsuu loadFirebaseInitialData:a kun valmis
function getLocaleStorage(){
  console.log("getLocaleStorage()");
  try {
    if (typeof(Storage) !== "undefined") {
      let myTeamString = localStorage.getItem('G_myTeam');
      let sportNames = new Array;
      let playerNames = new Array;
      let sportNames_ = JSON.parse( localStorage.getItem('G_game_sports_keys') );
      let playerNames_ = JSON.parse( localStorage.getItem('G_game_players_keys') );

      // Muuta vektoriksi, jos vain yksi laji tai pelaaja
      Array.isArray(sportNames_) ? sportNames = sportNames_ : sportNames.push(sportNames_);
      Array.isArray(playerNames_) ? playerNames = playerNames_ : playerNames.push(playerNames_);

      // INIT G_game
      if (myTeamString) {
        G_myTeam = JSON.parse(myTeamString);
        G_game.name = G_myTeam.gameName;
        playerNames.forEach( (playerName,ind,arr) => {
          G_game.players[playerName] = new Player(playerName);

        });
        sportNames.forEach((sportName,ind,arr) => {
          G_game.sports[sportName]=new Sport(sportName);
          playerNames.forEach( (playerName,ind,arr) => {
            //console.log(playerName);
            G_game.sports[sportName].players[playerName] = new Player(playerName);
          });
        });
      }
      else {
        console.log("localeStorage empty");
      }
      loadFirebaseInitialData();
    }
    else {
        console.log("Selain ei tue localStoragea");
    }
  } catch (e) {
    console.log("error: "+e);
    //location.reload();
  }
}

// Tallennetaan G_myTeam (ryhmä, pelin status, pelin nimi), lajin nimet ja kaikkien pelaajien nimet localeen
function setLocaleStorage(){
  console.log("setting localeStorage..");
  if (typeof(Storage) !== "undefined"){
    localStorage.setItem('G_myTeam', JSON.stringify(G_myTeam));
    localStorage.setItem('G_game_sports_keys', JSON.stringify(Object.keys(G_game.sports)));
    localStorage.setItem('G_game_players_keys', JSON.stringify(Object.keys(G_game.players)));

  } else {
      console.log("Selain ei tue localStoragea");
  }
}

//Lataa pelit ja pelaajat firestoresta => kutsuu initGame:a kun valmis
//     (OK)
function loadFirebaseInitialData() {
  console.log("loadFirebaseInitialData");
  console.log("Loading data from cloud...");

  //Hae pelaajat
  collectionRefPlayers.get()
  .then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
          G_database.players.push(doc.data());
      });
  })
  .catch(function(error) {console.log("Error getting player database: ", error);});
  //Hae pelit
  collectionRefGames.get()
  .then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
        G_database.games.push(doc.data());
        console.log(G_database);
      });
      initGame();
  })
  .catch(function(error) {console.log("Error getting games database: ", error);});
}

//Valitse pelinäkymä ja päivitä tiedot pilvestä jos peli kesken
// Alustaa G_gamen ja G_myTeamin jos pelit on loppu
function initGame() {

  //console.log('initGame()');
  //console.log(G_game.players);
  //console.log(G_myTeam);
  //console.log("G_myTeam.status: " + G_myTeam.status);
  if (G_myTeam.status=="empty") {

    let G_game = new Game("empty");
    let G_myTeam = new MyTeam;
    startScreen();
  }

  else if(G_myTeam.status=="results") {
    //console.log('RESULTS:');
    new Promise((resolve, reject) => updateGameDataFromDatabase(resolve, reject))
    .then( () => showResultTable())
    .catch( () => console.log("updateGameDataFromDatabase() Failed in InitGame()"));
  }
  else if(G_myTeam.status=="sportOn") {
    new Promise((resolve, reject) => updateGameDataFromDatabase(resolve, reject))
    .then( () => gameScreen() )
    .catch( () => console.log("updateGameDataFromDatabase() Failed in InitGame()"));
  }
  else if(G_myTeam.status=="sportFinished") {
    //showSportResults();
  }
  else {
    console.log("unknown game status");
  }
}

// MUUTA ETTEI HÄVITÄ METHODEJA?
function updateGameDataFromCloud(resolve, reject) {
  console.log("updating " + G_game.name + " from cloud");
  console.log(G_game);
  collectionRefGames.doc(G_game.name).get().then(function(doc) {
    if (doc.exists) {
      fetchedGameData = doc.data();
      setGameData(resolve, reject, fetchedGameData);
      //console.log(G_game);
      console.log("updateGameDataFromCloud OK");
      resolve("JEP");
    } else {
        console.log("No such game in cloud!");
        console.log("updateGameDataFromCloud FAILED");
        reject("NOPE");
    }
  }).catch(function(error) {
    console.log("Error getting game "+ G_game.name+" from cloud:", error);
    console.log("updateGameDataFromCloud FAILED");
    reject("NOPE");
  });
}

// Asettaa alkulatauksessa G_gamen datan G_databasesta.
// Eli luo objektit ja päivittää niihin pilvestä haetut datat
function updateGameDataFromDatabase(resolve, reject) {
  console.log("updateGameDataFromDatabase()");
  let fetchedGameData = G_database.games.find(e => e.name == G_myTeam.gameName);

  if (fetchedGameData) {

    new Promise((resolve, reject) => setGameData(resolve, reject, fetchedGameData))
    .then( () => {console.log("setGameDataOK");resolve("OK!")} )
    .catch( () => reject("ERROR") );
  }
  else {
    reject("ERROR");
  }
}

//Apufunktio - luo pelaaja ja sport objektit ja hakee datan sourcesta
function setGameData(resolve, reject, fetchedGameData){
  console.log("setGameData()");
  console.log(G_myTeam.gameName);

  G_game.status = fetchedGameData.status;
  G_game.name = fetchedGameData.name;
  G_game.maxStrokes = fetchedGameData.maxStrokes;
  G_game.currentSport = fetchedGameData.currentSport;
  console.log(fetchedGameData);
  let playerLength =   Object.keys(fetchedGameData.players).length;
  let playersProcessed;

  Object.keys(fetchedGameData.players).forEach( (playerName,ind,arr) => {
    G_game.players[playerName] = new Player(playerName);
    let tempObj = JSON.parse( JSON.stringify(fetchedGameData.players[playerName]) );
    G_game.players[playerName].pointsTot = tempObj.pointsTot;
    G_game.players[playerName].position = tempObj.position;
    playersProcessed = ind;
  })

  // VAriables to check that forEach has finished
  let sportLength = Object.keys(fetchedGameData.sports).length;
  let sportPlayersLength;
  var sportsProcessed;
  let sportPlayersProcessed;

  Object.keys(fetchedGameData.sports).forEach( (sportName,ind,arr) => {
    sportPlayersLength = Object.keys(fetchedGameData.players).length; //Number of players in the last sport
    G_game.sports[sportName]=new Sport(sportName);
    let tempObj = JSON.parse( JSON.stringify(fetchedGameData.sports[sportName]) );
    G_game.sports[sportName].maxScore = [...tempObj.maxScore];
    G_game.sports[sportName].parList = [...tempObj.parList];
    G_game.sports[sportName].parNr = tempObj.parNr;
    G_game.sports[sportName].totalPar = tempObj.totalPar;
    G_game.sports[sportName].status = tempObj.status;
    G_game.sports[sportName].maxSetting = tempObj.maxSetting;
    sportsProcessed = ind;

    Object.keys(fetchedGameData.players).forEach( (playerName,ind,arr) => {
      G_game.sports[sportName].players[playerName] = new Player(playerName);
      G_game.players[playerName].addSportPoints(sportName);
      G_game.sports[sportName].players[playerName].addSportResults(G_game.sports[sportName]);
      let tempObjPlayer = JSON.parse( JSON.stringify( fetchedGameData.players[playerName]) );
      let tempObjSportPlayer = JSON.parse( JSON.stringify( fetchedGameData.sports[sportName].players[playerName]) );

      G_game.players[playerName][sportName+'Points'] = tempObjPlayer[sportName+'Points'];
      G_game.players[playerName][sportName+'Score'] = tempObjPlayer[sportName+'Score'];
      G_game.players[playerName][sportName+'Position'] = tempObjPlayer[sportName+'Position'];
      G_game.sports[sportName].players[playerName].scoreList = tempObjSportPlayer.scoreList;
      G_game.players[playerName][sportName+'CurrentHole'] = tempObjPlayer[sportName+'CurrentHole'];
      sportPlayersProcessed = ind;

      if (sportsProcessed == (sportLength-1) && sportPlayersProcessed == (sportPlayersLength-1))
          resolve("OK!")
    })
  })
}

//Tallenna peli pilveen (Ei poista vanhoja documentteja mutta kirjaa päälle jos saman nimisiä)
function saveGame2cloud(resolve, reject) {
  if ( arguments.length == 0) {
    resolve = function(str) {};
    reject = function(str) {};
    console.log('saveGame2cloud()');
  }
  else {
    console.log('saveGame2cloud(resolve, reject)');
  }
  console.log(G_game);
  var gameDataStr = JSON.stringify(G_game);
  var gameData = JSON.parse(gameDataStr); //G_game:n Muunnos objektiksi ilman methodeja
  var gameDoc = G_game.name;
  console.log("gameData about to be saved to cloud:");
  console.log(gameData);
  firestore.collection('games').doc(gameDoc).set(gameData).then(function(doc) {
    console.log("Game saved succesfully");
    resolve("saveGame2cloud OK")
  }).catch(function(error) {
    console.log("Error saving game to cloud:", error);
    reject("saveGame2cloud error");
  });
}

// Yleiset pelaaja-tiedot
function savePlayer2cloud(player) {
  console.log('savePlayer2cloud(player)');
  let playerDoc = player.name;

  let playerData = {"name":player.name};

  firestore.collection('players').doc(playerDoc).set(playerData);
}



//EI KÄYTÖSSÄ!
function deleteLocaleStorage() {
  console.log('deleteLocaleStorage()');
  if (typeof(localStorage) !== "undefined") {
      //localStorage.removeItem('G_scrName');

  } else {
      console.log("Selain ei tue localStoragea");
  }
}

function deleteDocument(ref) {
  console.log('deleteDocument()');
  ref.delete().then(function() {
      console.log("Document successfully deleted!");
  }).catch(function(error) {
      console.error("Error removing document: ", error);
  });
}

function removePlayer(player) {
  console.log("removePlayer("+player+","+i+")");
  if(confirm("Poista pelaaja?")){
     var ref = player.playerRef;
     G_players.splice(i, 1);
     deleteDocument(ref);
     G_myGame.playerNr = G_myGame.playerNr - 1;
     saveGame2cloud();
  }
  return r;
}
