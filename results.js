// Kokonaistilanne, lajikohtaiset tulokset, hakee muitten tulokset pilvestä
function showResultTable() {

  if (false) {
    console.log(G_game);
    return false;

  }

  console.log("showResultTable()");
  G_myTeam.players.length > 0 ? $('#NavBtnJatka').show() : $('#NavBtnJatka').hide();
  G_myTeam.status = "results";
  let tableObjectArr = []; //Datavektori bootstrap tablelle
  let currentTableName = "Total";
  setLocaleStorage();
  $("#gameAppDiv").empty();

  // Ylärivin valintanapit (muuttuva grid jako lajien määrän mukaan)
  $("#gameAppDiv").append(`
    <div id="selectResultTableDiv" class="resTableSelGrid">
      <button id="totalResultsBtn" class="w3-button w3-green resTableSelGrid-item w3-small">Kokonaistilanne</button>
    </div>`);
  $(`#totalResultsBtn`).click(() => {
    showTable('Total');
  });

  const sportsKeys = Object.keys(G_game.sports);
  $(".resTableSelGrid").css("grid-template-columns", `repeat(${sportsKeys.length+1}, 1fr)`);
  for (const sport of sportsKeys) {
    $("#selectResultTableDiv").append(`<button class="w3-button w3-green resTableSelGrid-item w3-small" id = "totalResultsBtn_${sport}" >${sport}</button>`);
    $(`#totalResultsBtn_${sport}`).click(() => {
      showTable(sport);
    });
  }

  // pistetaulukko
  $("#gameAppDiv").append(`
    <table id="resultTable" class="table-sm table_condensed" data-sortable="true" data-sort-name="position" ></table>`);

  // alanapit
  $("#gameAppDiv").append(`
    <div id="alaNapitDiv" class="alaNapitGrid">
      <button id="updateBtn" class="w3-btn w3-green alaNapitGrid-item"> Päivitä </button>
      <div class="alaNapitGrid-item"> </div>
      <div class="alaNapitGrid-item"> </div>
      <button id="backBtn" class="w3-btn w3-green alaNapitGrid-item"> Takasin </button>
      <button id="continueBtn" class="w3-btn w3-green alaNapitGrid-item">Lopeta ${G_myTeam.currentSport}</button>
    </div>`);

  $("#updateBtn").click(() => {
    //console.log("UPDATE");
    new Promise((resolve, reject) => updateGameDataFromCloud(resolve, reject))
      .then(() => updateRanking())
      .then(() => {formTableData()})
      .then(() => {showTable()})
      .catch(console.log("Error in updateGameDataFromCloud() when Päivitysnappi was pushed"));
  });

//  console.log(G_myTeam.players.length > 0);


  if (G_myTeam.players.length == 0) {
    $("#backBtn").hide();
    $("#continueBtn").hide();
  }
  else {
    $("#backBtn").click(() => gameScreen());
    $("#continueBtn").click(() => {
      G_game.sports[G_myTeam.currentSport].status = "finished";
      G_myTeam = new MyTeam;
      setLocaleStorage();
      //loadFirebaseInitialData();
      G_database = new Database;
      loadFirebaseInitialData()
      //startScreen();
    });
  }



  // Hae data pilvestä --> Muodosta taulukkodata --> päivitä taulukko vasta sitten
  new Promise((resolve, reject) => updateGameDataFromCloud(resolve, reject))
    .then(() => {
        new Promise((resolve, reject) => updateRanking(resolve, reject) )
            .then( () => {
                new Promise((resolve, reject) => formTableData(resolve, reject) )
                  .then( () => showTable())
                  .catch(() => console.log("Error in formTableData when loading showResultTable()"));
                })
            .catch(() => console.log("Error in updateRanking when loading showResultTable()"));
        })
    .catch(() => console.log("Error in updateGameDataFromCloud when loading showResultTable()"));



  function updateRanking(resolve, reject) {
    console.log("updateRanking()");
    // Lajisijoitukset => lajipisteet
    let sportNames = Object.keys(G_game.sports);
    let playersArr = [];
    let totalRanking = [];

    console.log(G_game);
    // PLayers to array
    Object.keys(G_game.players).forEach((playerName, ind, arr) => {
      playersArr.push(G_game.players[playerName]); //ARRAY OF REFS
    });

   console.log(G_game.players);
  //  console.log(playersArr);
    // PLayer sport positions
    Object.keys(G_game.sports).forEach((sportName, ind, arr) => {
      //Laske vain jos laji alkanut!, muuten nolla kaikille
      if (G_game.sports[sportName].status == 'notStarted') {
        playersArr.forEach((player, ind) => {
          //console.log(player);
          G_game.players[player.name][sportName + 'Points'] = 0;
        });
      }
      else {
        // Ryhmitellään pelaajat pisteiden 2dim vektoriin:
        // [ [Jussi],
        // [Keijo, Jorma],
        // [],
        //[Sami] ]

        // Luodaan riittävän iso tyhjä vektori
        let maxScore = Math.max.apply(Math, playersArr.map(obj => {
          return obj[sportName + 'Score']
        }));

        console.log(sportName +" max score: "+maxScore);

        let scoreArrays = []; //Array of Arrays of Objects

        // Sadan offsetti koska pisteet voi mennä miinukselle!
        for (var i = 0; i <= maxScore + 100; i++) {
          scoreArrays[i] = [];
        };
      //  console.log(scoreArrays);

        //Lajitellaan pelaajat
        playersArr.forEach((player, ind) => {
        //  console.log(player.name + " "+sportName + " " +player[sportName + 'Score']);
          scoreArrays[player[sportName + 'Score'] + 100].push(player);
        //  console.log(scoreArrays[player[sportName + 'Score'] + 100]);
        });
        //console.log(scoreArrays);
        // Poistetaan tyhjät rivit
        scoreArrays = scoreArrays.filter((el) => {
          return el.length > 0;
        });

        let nextPosition = 0;

        //SAmat pisteet kaikille joilla on sama lyöntimäärä
        console.log(sportName);
        scoreArrays.forEach((scoreArr, ind) => {
          scoreArr.forEach((player, index) => {
            let pos = nextPosition;
            player[sportName + 'Position'] = nextPosition + 1;
            player.setPoints();
          })

          nextPosition += scoreArr.length; //0 0 1 1 0
        });
      }


    });
    //  TOTAL POSITIONIN LASKENTA
    //Array of Array of Objects, Eli lajitellaan pelaajat pisteiden mukaan
    //vektoriin ja jos on samat pisteet ni pelaajat menevät vektoriksi vektoriin
    // pointsArrays = [[Jussi, Jorma], [Olli], ...]
    let pointsArrays = [];

console.log(playersArr);
    //Vektorin koko = maksimipisteiden määrä
    let maxPoints = Math.max.apply(Math, playersArr.map(obj => {
      console.log(obj.pointsTot);
      return obj.pointsTot
    }));

    //Alustus vektoreiksi nollasta maksimimäärään
    for (var i = 0; i <= maxPoints; i++) {
      pointsArrays[i] = [];
    };

    playersArr.forEach((player, ind) => {
      pointsArrays[player.pointsTot].push(player);
    });

    pointsArrays = pointsArrays.filter((el) => {
      return el.length > 0;
    });
    let nextPosition = 0;
    let index_reversed = 0;

    let processed;

    for (var i = pointsArrays.length - 1; i >= 0; i--) {
      pointArr = pointsArrays[i];
      pointArr.forEach((player, index) => {
        player.position = nextPosition + index_reversed + 1;
      })
      nextPosition = pointArr.length - 1;
      index_reversed++;
      console.log(pointArr);
    }
    resolve("OK");
  }

// tableObject = yksi rivi (pelaaja)
  function formTableData(resolve, reject) {
    console.log("formTableData()");
    tableObjectArr = []; //Alustus, Data vektori bootstrap tablelle
    //let sportPlayers = G_game.sports[G_myTeam.currentSport].players; //REF
    let tableObject = new Object;
    let tableColumns = [];

    // Poimi pelaajadata
    Object.keys(G_game.players).forEach((playerName, index, array) => {
      let playerObj = G_game.players[playerName];
      let tableObject = new Object;
      tableObject.name = playerName;
      tableObject.pointsTot = playerObj.pointsTot;
      tableObject.position = playerObj.position;

      // Poimi Tulosdata
      Object.keys(G_game.sports).forEach((sportName, ind2, arr2) => {
        tableObject[sportName] = {};
        // Aseta viivat pisteiden tilalle jos lajia ei ole aloitettu
        tableObject[sportName+'CurrentHole'] =playerObj[sportName+'CurrentHole'];
        // console.log("G_game.sports["+sportName+"].status: " + G_game.sports[sportName].status);

        //Korjaa pistemäärä?
        if  (G_game.sports[sportName].status == "notStarted") {
          tableObject[sportName + 'Points'] = "-";
          tableObject[sportName + 'Score'] = "-";
          tableObject[sportName + 'Position'] = "-";
        }
        else {
          tableObject[sportName + 'Points'] = G_game.players[playerName][sportName + 'Points'];
          tableObject[sportName + 'Score'] = G_game.players[playerName][sportName + 'Score'];
          tableObject[sportName + 'Position'] = G_game.players[playerName][sportName + 'Position'];
        }
        //scorelist to object
        const sportScoreList = G_game.sports[sportName].players[playerName].scoreList;

        tableObject[sportName].scorelist = {};
        // Vektorista objektiksi..
        for (var i = 0; i < sportScoreList.length; i++) {
        //for (var i = 0; i <tableObject[sportName+'CurrentHole']; i++) {
          tableObject[sportName].scorelist[i] = sportScoreList[i];
        }
        // Käymättä olevat väylät viivaksi
        for (var i = sportScoreList.length-1; i > tableObject[sportName+'CurrentHole'] - 1; i--) {
          tableObject[sportName].scorelist[i] = '-';
        }
      })
      tableObjectArr.push(tableObject);
    })
    // console.log('tableObjectArr');
    // console.log(tableObjectArr);
    resolve("OK")
    return tableObjectArr;

  }

  function showTable(tableName = currentTableName) {
    console.log("showTable("+tableName+")");
    currentTableName = tableName;

    tableColumns = [];

    if (tableName == "Total") {
      tableColumns.push({
        field: 'position',
        title: '',
        sortable: true,
        class: 'sijoitusCol'
      });
      tableColumns.push({
        field: 'name',
        title: 'Pelaaja'
      });
      tableColumns.push({
        field: 'pointsTot',
        title: 'Kokonaispisteet'
      });
      // Laji scoret ja pisteet
      Object.keys(G_game.sports).forEach((sportName, index, array) => {
        //console.log(sportName);
        tableColumns.push({
          field: `${sportName}Position`,
          title: `${sportName} sij.`,
          sortable: true
        });
        //tableColumns.push({field: `${sportName}Score` ,title: `${sportName} +/-`,sortable: true});
        tableColumns.push({
          field: `${sportName}Points`,
          title: `${sportName} p.`,
          sortable: true
        });
      });
    } else {
      // Yhden lajin scoret ja pisteet ja väylätulokset
      let sportName = tableName;
      tableColumns.push({
        field: `${sportName}Position`,
        title: ``,
        sortable: true
      });
      tableColumns.push({
        field: 'name',
        title: 'Pelaaja'
      });
      tableColumns.push({
        field: `${sportName}CurrentHole`,
        title: 'Väylällä',
        class: 'currentHoleCol',
        width: 25

      });

      tableColumns.push({
        field: sportName + 'Score',
        title: '+/-',
        sortable: true,
        class: "sportSumOnResTab"
      });

      Object.keys(tableObjectArr[0][sportName].scorelist).forEach((element, index, array) => {
        tableColumns.push({
          field: `${sportName}.scorelist.${index}`,
          title: index + 1,
          width: "1"
        });
      });

    }

    //console.log("tableColumns:");
    //  console.log(tableColumns);
    $('#resultTable').bootstrapTable('destroy');
    $('#resultTable').bootstrapTable({
      columns: tableColumns,
      data: tableObjectArr,
      class: "resultTable"
    })
  }

}
