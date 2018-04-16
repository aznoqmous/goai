var cursX = 0;
var cursY = 0;

$(function(){
  var m = new Master();
  $(document).keydown(function(e){m.keys[e.key] = 1;});
  $(document).keyup(function(e){m.keys[e.key] = 0;});

  loop();
  function loop(){
    m.do();
    requestAnimationFrame(loop);
  }
  $("canvas").mousemove(function(e){
    cursX = e.pageX - $(this).offset().left + m.cellSize / 2;
    cursY = e.pageY - $(this).offset().top + m.cellSize / 2;
  });
  $("canvas").click(function(){
    if(m.mode == 'count'){
      var stn = m.getStn(m.pX, m.pY);
      if(stn) {
        if(stn.grp) m.delFullGrp(stn.grp.id)
        else m.delStn(stn.id);
      }
      else m.newStn(m.pX, m.pY);
    }
    else m.newStn(m.pX, m.pY);

  });
  $("#turns").click(function(){
    $(this).toggleClass('active');
    m.stnTurnDisp = toggle(m.stnTurnDisp);
    if($(this).hasClass('active') && $("#libs").hasClass('active')){
      $("#libs").removeClass('active');
      m.libsDisp = toggle(m.libsDisp);
    }
  });
  $("#libs").click(function(){
    $(this).toggleClass('active');
    m.libsDisp = toggle(m.libsDisp);
    if($(this).hasClass('active') && $("#turns").hasClass('active')){
      $("#turns").removeClass('active');
      m.stnTurnDisp = toggle(m.stnTurnDisp);
    }

  });
  $("#count").click(function(){
    $(this).toggleClass('active');
    if($(this).hasClass('active')){
      $(this).html('return');
      m.mode = 'count';
    }else{

      $(this).html('count');
      m.mode = m.lastMode;
    }
  });
  $("#grps").click(function(){
    $(this).toggleClass('active');
    m.grpsDisp = toggle(m.grpsDisp);
  });
  $("#infs").click(function(){
    $(this).toggleClass('active');
    m.infsDisp = toggle(m.infsDisp);
  });
  $("#bp").click(function(){
    $(this).toggleClass('active');
    m.bpDisp = toggle(m.bpDisp);
  });
  $("#grid").click(function(){
    $(this).toggleClass('active');
    m.grdDisp = toggle(m.grdDisp);
  });
  $("#auto").click(function(){
    m.autoplay = toggle(m.autoplay);
    $("#auto").toggleClass('active');
  });
  $("#search").keyup(function(){
    m.search($(this).val());
  });
  $(".game").click(function(){
    m.loadGame($(this).attr("data-id"));
    $(".game").removeClass("active");
    $(this).addClass("active");
  });

});


class Master{
  constructor(){
    this.c = document.getElementById("canvas");
    this.ctx = this.c.getContext("2d");
    this.size = 19;
    this.off = this.c.width/20;
    this.cellSize = ((this.c.width - this.off*2) / (this.size-1));
    this.dotSize = this.cellSize / 3;
    this.keys = {};
    this.bs = []; this.dbs = [];
    this.ws = []; this.dws = [];
    this.grps = []; this.dgrps = [];
    this.turn = 0;
    this.currTurn = 0;
    this.lastT = Date.now();
    this.speed = 100;
    this.next = 0;
    this.lastP = 0;
    this.mode = 'pVSia';
    this.modes = ['iaVSia', 'pVSia', 'pVSp', 'read'];
    this.lastMode = this.mode;
    this.bpts = 0; this.bcapt = 0;
    this.wpts = 0; this.wcapt = 0;
    this.komi = 6.5;
    this.grpsDisp = 0;
    this.libsDisp = 0;
    this.infsDisp = 0;
    this.bpDisp = 0;
    this.grdDisp = 1;
    this.stnTurnDisp = 0;

    this.autoplay = 0;

    this.ko = 0;
    this.infs = [];
    this.bestPlays = [];

    this.games = [];
    this.datas = datas;
    // console.log(this.games);
    this.build();

    this.getInfs();
    this.getBestPlays();
  }

  do(){
    this.clear();
    // this.clearW();


    // this.drawKo();



    if(this.grdDisp) this.drawGrid();
    if(this.bpDisp) this.drawBestPlays();
    if(this.infsDisp) this.drawInf();

    this.drawStns();
    this.drawLastP();


    if(this.grpsDisp) this.drawGrps();
    if(this.libsDisp) this.drawLibs();


    this.doTurn();

    if(this.next){
      this.clean();
      this.next = 0;
    }


  }

  reset(){
    this.bs = [];
    this.ws = [];
    this.turn = 0;
    this.currTurn = 0;
    this.lastT = Date.now();
    this.grps = [];
    this.next = 0;
    this.lastP = 0;
    this.bpts = 0; this.bcapt = 0;

    this.wpts = 0; this.wcapt = 0;

    this.ko = 0;
    this.infs = [];
    this.bestPlays = [];
  }

  build(){
    for (var i = 0; i < this.datas.length; i++) {
      var data = this.datas[i];
      // got rb & rw
      if(parseInt(data.rb.replace('d',''))*parseInt(data.rw.replace('d',''))) this.newGame(data);

    }
    this.games.sort(compHighest);
    for (var i = 0; i < this.games.length; i++) {
      var g = this.games[i];
      var res = "";
      res = '<span class="game" data-id="'+g.id+'"><div>'+g.avg+'d</div> <div><b class="blk">'+g.b+' / '+g.rb+'d</b><b class="wht">'+g.w+' / '+g.rw+'d</b></div></span>';
      $(".menu").append(res);
    }
  }
  search(value){
    $(".game").addClass('hidden');
    $(".game").each(function(){
      if($(this).html().match(value)){
        $(this).removeClass("hidden");
      }
    });
  }
  newGame(data){
    var nGame = new Game(data.b, data.w, data.rb, data.rw, data.r, data.k, data.plays);
    nGame.id = this.games.length;
    this.games.push(nGame);

  }
  getGameById(id){
    for (var i = 0; i < this.games.length; i++) {
      if(id == this.games[i].id) return this.games[i];
    }
    return false;
  }
  loadTurn(turn){
    console.log("Loading", turn);
    if(turn < this.currGame.plays.length){
      this.reset();
      this.currTurn = 0;
      for (var i = 0; i < turn; i++) {
        this.nextTurn();
        console.log(i);
      }
    }

  }
  loadGame(id){
    this.reset();
    this.mode = 'load';
    this.currGame = this.getGameById(id);
    this.turnArr = [];
    $("#currTurn").attr("max", this.currGame.plays.length);
    // console.log('Loading', this.currGame.b, 'vs', this.currGame.w);
  }
  getPlay(play){
    if(!play.length) return false;
    var x = play[0];
    var y = play[1];
    var alpha = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"];
    for (var i = 0; i < alpha.length; i++) {
      var a = alpha[i];
      if(x == a) x = i;
      if(y == a) y = i;
    }
    return {x: x, y: y}
  }

  getBestPlaysArr(){
    var incr = 1;
    // if(this.turn) incr = 1;
    var min = 0;
    var pos = 0;
    var thresh = 0;
    var bestPlaysArr = [];
    for (var i = 0; i < this.bestPlays.length; i++) {
      for (var j = 0; j < this.bestPlays[i].length; j++) {
        var currPlay =  this.bestPlays[i][j];
        // if(currPlay * incr > thresh ) {
          bestPlaysArr.push({x: i, y: j, value: currPlay});
        // }
      }
    }
    function comp(a, b){
      if(a.value < b.value) return 1;
      else return -1;
    }
    bestPlaysArr.sort(comp);
    if(bestPlaysArr.length) console.log(bestPlaysArr[0]);
    return bestPlaysArr;
  }
  getBestPlays(){
    var range = 4;
    var emptyArr = this.get2DEmptyArr(this.size, this.size);
    var val = -1;
    if(this.turn) val = 1;
    for (var i = 0; i < emptyArr.length; i++) {
      for (var j = 0; j < emptyArr[i].length; j++) {
        var bad = 1;
        if(i < 3) bad++;
        if(j < 3) bad++;
        if(i >= this.size - 3) bad++;
        if(j >= this.size - 3) bad++;
        var th = Math.abs( Math.cos(i/this.size*2*Math.PI) + Math.cos(j/this.size*2*Math.PI) ) ;
        emptyArr[i][j] =  val * ((this.getInfWeights(i, j, range) - th/2) / bad);
      }
    }
    this.bestPlays = emptyArr;
  }
  getInfWeights(x, y, range){
    var weight = 0;
    for (var i = 0; i < range.length; i++) {
      weight += this.getInfWeight(x + i, y) / (i+1) / range;
      weight += this.getInfWeight(x - i, y) / (i+1) / range;
      weight += this.getInfWeight(x, y + i) / (i+1) / range;
      weight += this.getInfWeight(x, y - i) / (i+1) / range;
    }
    for (var i = 1; i < range; i++) {
      for (var j = 1; j < range; j++) {
        weight += this.getInfWeight(x + i, y + j) / (i * j) / range ;
        weight += this.getInfWeight(x + i, y - j) / (i * j) / range ;
        weight += this.getInfWeight(x - i, y + j) / (i * j) / range ;
        weight += this.getInfWeight(x - i, y - j) / (i * j) / range ;
      }
    }
    // console.log(weight);
    return weight / range;
  }
  getInfWeight(x, y){
    if(this.infs[x] != undefined){
      if(this.infs[x][y] != undefined){
        var val = -1;
        if(this.turn) val = 1;
        // console.log(this.infs[x][y]-val);
        return this.infs[x][y] * val;
      }
      return 0;
    }
    return 0;
  }
  get2DEmptyArr(x, y){
    var res = [];
    for (var i = 0; i < x; i++) {
      res.push([]);
      for (var j = 0; j < y; j++) {
        res[i].push(0);
      }
    }
    return res;
  }
  getInfs(){
    this.infs = this.get2DEmptyArr(this.size, this.size);
    for (var i = 0; i < this.bs.length; i++) {
      var b = this.bs[i];
      this.applyInfs(b);
    }
    for (var i = 0; i < this.ws.length; i++) {
      var w = this.ws[i];
      this.applyInfs(w);
    }
  }
  applyInfs(stn){
    var range = 10;

    var incr = -1/range;
    if(stn.color == 'white') incr = 1/range;
    // if(stn.grp) incr *= stn.grp.stns.length;
    for (var i = 0; i < range; i++) {
      this.newInf(stn.color, stn.x + i, stn.y, incr*(range-i)/(i+1));
      this.newInf(stn.color, stn.x - i, stn.y, incr*(range-i)/(i+1));
      this.newInf(stn.color, stn.x, stn.y + i, incr*(range-i)/(i+1));
      this.newInf(stn.color, stn.x, stn.y - i, incr*(range-i)/(i+1));
    }
    for (var i = 1; i < range; i++) {
      for (var j = 1; j < range; j++) {
        this.newInf(stn.color, stn.x + i, stn.y + j, incr/(i*j));
        this.newInf(stn.color, stn.x + i, stn.y - j, incr/(i*j));
        this.newInf(stn.color, stn.x - i, stn.y + j, incr/(i*j));
        this.newInf(stn.color, stn.x - i, stn.y - j, incr/(i*j));
      }
    }
  }
  newInf(color, x, y, val){
    // if(this.getStn(x, y).color == color) val = val*2;
    if(this.infs[x] != undefined) if(this.infs[x][y] != undefined){
      this.infs[x][y] += val;
    }
  }
  drawInf(){
    // this.ctx.globalAlpha = 1;
    for (var i = 0; i < this.infs.length; i++) {
      for (var j = 0; j < this.infs[i].length; j++) {
        // this.ctx.globalAlpha = this.infs[i][j];
        // if(this.infs[i][j] > 0) color = "255, 255, 255";
        // else color = "255, 255, 255";
        this.drawDot(i, j, this.getInfCol(this.infs[i][j]), this.cellSize/2);
        // this.ctx.fillStyle = this.getInfCol(this.infs[i][j]);
        // this.ctx.fillRect(this.off/2+i*this.cellSize, this.off/2+j*this.cellSize, this.cellSize, this.cellSize);
        // this.ctx.strokeStyle = this.getInfCol(this.infs[i][j]);
        // this.ctx.strokeRect(this.off/2+i*this.cellSize, this.off/2+j*this.cellSize, this.cellSize, this.cellSize);
      }
    }
    this.ctx.globalAlpha = 1;
  }
  drawBestPlays(){
    // this.ctx.globalAlpha = 0.5;
    for (var i = 0; i < this.bestPlays.length; i++) {
      for (var j = 0; j < this.bestPlays[i].length; j++) {
        // this.drawDot(i, j, this.getInfCol(this.bestPlays[i][j]), this.cellSize/2);
        // this.ctx.fillStyle = this.getInfCol(this.bestPlays[i][j]);
        // this.ctx.fillRect(this.off/2+i*this.cellSize, this.off/2+j*this.cellSize, this.cellSize, this.cellSize);
        this.ctx.strokeStyle = this.getInfCol(this.bestPlays[i][j]);
        this.ctx.beginPath();
        this.ctx.arc(this.off+i*this.cellSize,this.off+j*this.cellSize, this.cellSize/7*2, 2*Math.PI, 0);
        this.ctx.stroke();
      }
    }
    this.ctx.globalAlpha = 1;
  }

  clearW(){
    this.ctx.fillStyle = "rgba(128,128,128,1.0)";
    this.ctx.fillRect(0, 0, this.c.width, this.c.height);
  }
  clear(){
    this.ctx.fillStyle = "rgb(190, 157, 82)";
    this.ctx.fillRect(0, 0, this.c.width, this.c.height);
  }
  drawGrid(){
    this.ctx.strokeStyle = "#222";
    var gw = this.c.width-this.off*2;
    var gh = this.c.height-this.off*2;
    var size = this.size - 1;
    for (var i = 0; i < this.size; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.off+i*this.cellSize, this.off); this.ctx.lineTo(this.off+i*this.cellSize, this.off+gh); this.ctx.stroke();
      this.ctx.moveTo(this.off, this.off+i*this.cellSize); this.ctx.lineTo(this.off+gw, this.off+i*this.cellSize); this.ctx.stroke();
    }
    this.drawDot(9, 9, "black", this.dotSize);
    this.drawDot(3, 3, "black", this.dotSize);
    this.drawDot(15, 15, "black", this.dotSize);
    this.drawDot(3, 15, "black", this.dotSize);
    this.drawDot(15, 3, "black", this.dotSize);
    this.drawDot(9, 3, "black", this.dotSize);
    this.drawDot(9, 15, "black", this.dotSize);
    this.drawDot(3, 9, "black", this.dotSize);
    this.drawDot(15, 9, "black", this.dotSize);
    // this.drawStn(1, 0, "black");
    // this.drawStn(2, 0, "black");
    // this.drawStn(3, 0, "black");
  }
  drawStns(){
    this.ctx.globalAlpha = 1;
    for (var i = 0; i < this.bs.length; i++) {
      var b = this.bs[i];
      this.drawStn(b.x, b.y, b.color);
      if(this.stnTurnDisp) this.drawStnTurn(b);
    }
    for (var i = 0; i < this.ws.length; i++) {
      var w = this.ws[i];
      this.drawStn(w.x, w.y, w.color);
      if(this.stnTurnDisp) this.drawStnTurn(w);
    }
  }
  drawStn(x, y, color){
    this.ctx.shadowColor = 'rgba(0,0,0, 0.2)';
    this.ctx.shadowBlur = 5;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(this.off+x*this.cellSize, this.off+y*this.cellSize, this.cellSize/2-0.5, 2*Math.PI, 0);
    this.ctx.fill();
    this.ctx.shadowColor = 'rgba(0,0,0,0)';
    this.ctx.shadowBlur = 0;
  }
  drawStnTurn(stn){
    if(stn.color == 'black') this.ctx.fillStyle = 'white';
    else this.ctx.fillStyle = 'black';
    this.ctx.textAlign = "center";
    if(stn.turn != this.currTurn-1) this.ctx.fillText(stn.turn+1, this.off+stn.x*this.cellSize, this.off+stn.y*this.cellSize+4);
  }
  drawLibs(){
    for (var i = 0; i < this.bs.length; i++) {
      var b = this.bs[i];
      this.drawLib(b);
    }
    for (var i = 0; i < this.ws.length; i++) {
      var w = this.ws[i];
      this.drawLib(w);
    }
  }
  drawLib(stn){
    if(stn.color == 'black') this.ctx.fillStyle = 'white';
    else this.ctx.fillStyle = 'black';
    this.ctx.textAlign = "center";
    this.ctx.fillText(stn.libs, this.off+stn.x*this.cellSize, this.off+stn.y*this.cellSize+4);
  }
  drawDot(x, y, color, size){
    if(x >= 0 && x < this.size && y >= 0 && y < this.size){
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(this.off+x*this.cellSize, this.off+y*this.cellSize, size/2, 2*Math.PI, 0);
      this.ctx.fill();
    }

  }
  drawArc(x, y, color, size){
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.beginPath()
    this.ctx.arc(this.off+x*this.cellSize, this.off+y*this.cellSize, this.cellSize/2-size, 2*Math.PI, 0);
    this.ctx.stroke();
    this.ctx.lineWidth = 1;
  }
  drawGrps(){
    for (var i = 0; i < this.grps.length; i++) {
      var grp = this.grps[i];
      for (var j = 0; j < grp.stns.length; j++) {
        var s = grp.stns[j];
        // this.drawDot(s.x, s.y, grp.color, this.cellSize/4*3);
        this.drawArc(s.x, s.y, grp.color, 3);
      }
    }

  }
  drawHover(){
    var x = Math.floor((cursX-this.off)/this.cellSize);
    var y = Math.floor((cursY-this.off)/this.cellSize);
    this.pX = x;
    this.pY = y;
    var color = 'rgba(0, 0, 0, 0.5)';
    if(this.turn) color = 'rgba(255, 255, 255, 0.5)';
    this.drawDot( x, y, color, this.cellSize);
  }
  drawDeadHover(){
    var x = Math.floor((cursX-this.off)/this.cellSize);
    var y = Math.floor((cursY-this.off)/this.cellSize);
    this.pX = x;
    this.pY = y;
    this.drawDot( x, y, 'red', this.cellSize/2);
  }
  drawLastP(){
    var color = 'rgba(0,0,0,0.8)';
    if(this.turn) color = 'rgba(255,255,255,0.8)';
    this.drawDot(this.lastP.x, this.lastP.y, color, this.cellSize/3)
  }
  drawKo(){
    if(this.ko){
      this.drawDot(this.ko.x, this.ko.y, 'rgba(255,0,0,0.5)', this.cellSize/2);
    }
  }
  clean(){
    this.getLibs();
    var deadStn = [];
    for (var i = 0; i < this.bs.length; i++) {
      var b = this.bs[i];
      if(!b.libs && this.lastP.id != b.id) deadStn.push(b);
    }
    for (var i = 0; i < deadStn.length; i++) {

      this.delStn(deadStn[i].id);
    }

    deadStn = [];
    for (var i = 0; i < this.ws.length; i++) {
      var w = this.ws[i];
      if(!w.libs && this.lastP.id != w.id) deadStn.push(w);
    }
    for (var i = 0; i < deadStn.length; i++) {
      if(deadStn[i].grp) this.delGrp(deadStn[i].grp.id);
      this.delStn(deadStn[i].id);

    }
  }

  displayCapt(){
    $(".bscore").html('(capt: '+this.bcapt+')');
    $(".wscore").html('(capt: '+this.wcapt+')');
  }

  newStn(x, y){
    if(!this.getStn(x, y)){
      if(this.ko){
        if(this.ko.x != x || this.ko.y || y) this.ko = 0;
      }
      var n = [];
      var e = [];
      var sw = this.ws.length;
      var sb = this.bs.length;
      if(this.turn) {
        var nStn = new Stn(x, y, 'white');
        n = this.getNeighsF(nStn);
        e = this.getNeighsE(nStn)
        if(this.getStnLibs(nStn) || n.length) this.ws.push(nStn);
        if(e.length){
          var ok = 0;
          for (var i = 0; i < e.length; i++) {
            if(e[i].libs == 1) ok = 1;
          }
          if(ok) this.ws.push(nStn);
        }
      }
      else {
        var nStn = new Stn(x, y, 'black');
        n = this.getNeighsF(nStn);
        e = this.getNeighsE(nStn)
        if(this.getStnLibs(nStn) || n.length) this.bs.push(nStn);
        if(e.length){
          var ok = 0;
          for (var i = 0; i < e.length; i++) {
            if(e[i].libs == 1) ok = 1;
          }
          if(ok) this.bs.push(nStn);
        }
      }
      if(sw != this.ws.length || sb != this.bs.length){
        if(n.length){
          n.push(nStn);
          this.newGrp(n);
        }
        this.getInfs();
        this.getBestPlays();
        this.lastP = nStn;
        nStn.turn = this.currTurn;
        this.endTurn();
      }

    }
  }
  newGrp(stnArr){
    var resArr = stnArr;
    var pushedGrps = [];
    for (var i = 0; i < stnArr.length; i++) {
      var s = stnArr[i];
      if(s.grp){
        if(!isIn(pushedGrps, s.grp.id)){
          pushedGrps.push(s.grp.id);
          for (var j = 0; j < s.grp.stns.length; j++) {
            var gs = s.grp.stns[j];
            if(gs.id != s.id){ resArr.push(gs); }
          }
          this.delGrp(s.grp.id);
        }
      }
    }
    var grp = new Grp(resArr);
    this.grps.push(grp);
  }

  getStn(x, y){
    for (var i = 0; i < this.bs.length; i++) {
      var b = this.bs[i];
      if(b.x == x && b.y == y) return b;
    }
    for (var i = 0; i < this.ws.length; i++) {
      var w = this.ws[i];
      if(w.x == x && w.y == y) return w;
    }
    return false;
  }
  getStnById(id){
    for (var i = 0; i < this.bs.length; i++) {
      var b = this.bs[i];
      if(b.id == id) return b;
    }
    for (var i = 0; i < this.ws.length; i++) {
      var w = this.ws[i];
      if(w.id == id) return w;
    }
    return false;
  }
  getStnLibs(stn){
      var libs = 4;
      if( this.getStn(stn.x-1, stn.y) ) libs--;
      if( this.getStn(stn.x+1, stn.y) ) libs--;
      if( this.getStn(stn.x, stn.y-1) ) libs--;
      if( this.getStn(stn.x, stn.y+1) ) libs--;
      if(stn.x <= 0 || stn.x >= this.size-1) libs--;
      if(stn.y <= 0 || stn.y >= this.size-1) libs--;
      stn.libs = libs;
      return libs;
  }
  getStnLibsArr(stn){
    var libs = [
      {x: stn.x-1, y: stn.y},
      {x: stn.x+1, y: stn.y},
      {x: stn.x, y: stn.y-1},
      {x: stn.x, y: stn.y+1}
    ];
    var corres = [1, 1, 1, 1];
    if( this.getStn(stn.x-1, stn.y) ) corres[0] = 0;
    if( this.getStn(stn.x+1, stn.y) ) corres[1] = 0;
    if( this.getStn(stn.x, stn.y-1) ) corres[2] = 0;
    if( this.getStn(stn.x, stn.y+1) ) corres[3] = 0;
    if(stn.x <= 0 ) corres[0] = 0;
    if ( stn.x >= this.size-1) corres[1] = 0;
    if(stn.y <= 0 ) corres[2] = 0;
    if ( stn.y >= this.size-1) corres[3] = 0;
    var res = [];
    for (var i = 0; i < corres.length; i++) {
      var c = corres[i];
      if(c) res.push(libs[i]);
    }
    return res;
  }
  getGrpLibs(grp){
    var libsGrp = [];
    for (var i = 0; i < grp.stns.length; i++) {
      var libsArr = this.getStnLibsArr(grp.stns[i]);
      for (var j = 0; j < libsArr.length; j++) {
        var lib = libsArr[j];
        if(!libIsIn(libsGrp, lib)) libsGrp.push(lib);
      }
    }
    for (var i = 0; i < grp.stns.length; i++) {
      grp.stns[i].libs = libsGrp.length;
    }
    grp.libs = libsGrp.length;
    return libsGrp.length;
  }
  getLibs(){
    for (var i = 0; i < this.bs.length; i++) {
      var stn = this.bs[i];
      if(!stn.grp) this.getStnLibs(stn);
      else this.getGrpLibs(stn.grp);
    }
    for (var i = 0; i < this.ws.length; i++) {
      var stn = this.ws[i];
      if(!stn.grp) this.getStnLibs(stn);
      else this.getGrpLibs(stn.grp);
    }
  }
  getNeighsF(stn){
    var friends = [];
    var neighs = [];
    var l = this.getStn(stn.x-1, stn.y);
    var r = this.getStn(stn.x+1, stn.y);
    var u = this.getStn(stn.x, stn.y-1);
    var b = this.getStn(stn.x, stn.y+1);
    if(l) neighs.push(l);
    if(r) neighs.push(r);
    if(u) neighs.push(u);
    if(b) neighs.push(b);
    for (var i = 0; i < neighs.length; i++){
      if(neighs[i].color == stn.color) friends.push(neighs[i]);
    }
    return friends;
  }
  getNeighsE(stn){
    var foes = [];
    var neighs = [];
    var l = this.getStn(stn.x-1, stn.y);
    var r = this.getStn(stn.x+1, stn.y);
    var u = this.getStn(stn.x, stn.y-1);
    var b = this.getStn(stn.x, stn.y+1);
    if(l) neighs.push(l);
    if(r) neighs.push(r);
    if(u) neighs.push(u);
    if(b) neighs.push(b);
    for (var i = 0; i < neighs.length; i++){
      if(neighs[i].color != stn.color) foes.push(neighs[i]);
    }
    return foes;
  }
  getTeam(){
    var team = this.bs;
    if(this.turn) team = this.ws;
    return team;
  }
  getFoes(){
    var foes = this.ws;
    if(this.turn) foes = this.bs;
    return foes;
  }
  getWkst(team){
    var threshold = 4;
    var wkst = 0;
    for (var i = 0; i < team.length; i++) {
      var f = team[i];
      if(f.libs < threshold && !f.grp) wkst = f;
    }
    return wkst;
  }
  getColor(){
    var color = 'black';
    if(this.turn) color = 'white';
    return color;
  }
  getInfCol(val){
    if(val < 0) return 'rgba(0, 0, 0, '+(val+1) /2+')';
    if(val > 0) return 'rgba(255, 255, 255, '+(val+1) /2+')';
  }

  count(){
    this.bpts = 0;
    this.wpts = 0;
    for (var i = 0; i < this.size; i++) {
      for (var j = 0; j < this.size; j++) {
        if(!this.getStn(i, j)){
          var t = this.getTerritoty(i, j);
          if(t) this.drawDot(i, j, t, this.cellSize/2);
          if(t == 'white') this.wpts++;
          if(t == 'black') this.bpts++;
        }
      }
    }
    this.wpts += this.komi;
    $(".bscore").html(this.bpts+this.bcapt+'pts | terr: '+this.bpts+'(capt: '+this.bcapt+')');
    $(".wscore").html(this.wpts+this.wcapt+'pts | terr: '+this.wpts+'(capt: '+this.wcapt+') +'+this.komi+' komi');
  }
  getTerritoty(x, y){
    var res = [ this.getLeft(x, y), this.getRight(x, y), this.getTop(x, y), this.getDown(x, y) ];
    var winner = 0;
    for (var i = 0; i < res.length; i++) {
      var r = res[i];
      if(!winner && r) winner = r;
      if(r && r != winner) return false;
    }
    return winner;
  }
  getLeft(x, y){
    var i = 0;
    while(1){
      i++;
      var l = this.getStn(x-i, y);
      if(x-i < 0) return false;
      if(l) return l.color;
    }
  }
  getRight(x, y){
    var i = 0;
    while(1){
      i++;
      var r = this.getStn(x+i, y);
      if(x+i >= this.size) return false;
      if(r) return r.color;
    }
  }
  getTop(x, y){
    var i = 0;
    while(1){
      i++;
      var t = this.getStn(x, y-i);
      if(y-i < 0) return false;
      if(t) return t.color;
    }
  }
  getDown(x, y){
    var i = 0;
    while(1){
      i++;
      var d = this.getStn(x, y+i);
      if(y+i >= this.size) return false;
      if(d) return d.color;
    }
  }

  delFullGrp(id){
    for (var i = 0; i < this.grps.length; i++) {
      var g = this.grps[i];
      if(g.id == id) {
        for (var j = 0; j < g.stns.length; j++) {
          this.delStn(g.stns[j].id);
        }
        this.grps.splice(i, 1);
        return true;
      }
    }
  }
  delGrp(id){
    for (var i = 0; i < this.grps.length; i++) {
      var g = this.grps[i];
      if(g.id == id) {
        // for (var j = 0; j < g.stns.length; j++) {
        //   this.delStn(g.stns[j].id)
        // }
        this.dgrps.push({ turn: this.currTurn, g: g });
        this.grps.splice(i, 1);
        return true;
      }
    }
  }
  delStn(id){
    var dead = 'empty';
    for (var i = 0; i < this.bs.length; i++) {
      var b = this.bs[i];
      if(b.id == id){
        dead = i;
        this.dbs.push({ turn: this.currTurn, b: g });
        this.wcapt++;
        if(!b.grp) this.ko = {x: b.x, y: b.y}
      }
    }
    if(dead != 'empty') this.bs.splice(dead, 1);
    dead = 'empty';
    for (var i = 0; i < this.ws.length; i++) {
      var w = this.ws[i];
      if(w.id == id) {
        dead = i;
        this.dws.push({ turn: this.currTurn, w: g });
        this.bcapt++;
        if(!b.grp) this.ko = {x: b.x, y: b.y}
      }
    }
    if(dead != 'empty') this.ws.splice(dead, 1);
  }

  canPlay(x, y){
    if(x >= 0 && y >= 0 && x < this.size && y < this.size){
      if(this.ko){
        if(this.ko.x == x && this.ko.y == y) return false;
      }
      if(this.getStn(x, y)) return false;

      if(!this.getStnLibs({x:x, y:y, color: this.getColor()})){
        // if(this.getNeighsF({x:x, y:y, color: this.getColor()}).length) return true;
        var foes = this.getNeighsE({x:x, y:y, color: this.getColor()});
        if(foes.length){
          for (var i = 0; i < foes.length; i++) {
            if(foes[i].libs < 2) return true;
          }
          return false;
        }
      }



      return true;
    }else{
      return false;
    }
  }

  doIA(){
    var team = this.getTeam();
    var foes = this.getFoes();
    var wFrd = this.getWkst(team);
    var wFoe = this.getWkst(foes);
    if(wFrd.libs < 3 || wFoe.libs < 3){
      var moveArr = [];
      if(wFrd.libs < 3) moveArr = this.getStnLibsArr(wFrd);
      else if(wFoe.libs < 3) moveArr = this.getStnLibsArr(wFoe);
      console.log(moveArr);

      if(moveArr.length){
        // this.drawDotArr(moveArr);
        for (var i = 0; i < moveArr.length; i++) {
          var move = moveArr[i];
          if(this.canPlay(move.x, move.y)) {
            console.log('wkst');
            this.newStn(move.x, move.y);
            return true;
          }
        }
      }

    }

    var plays = this.getBestPlaysArr();
    if(plays.length) {
      console.log("bp : "+plays.length);
      var rand = Math.floor(Math.random()*3)+1;
      for (var i = 0; i < plays.length; i++) {
        var play = plays[i];
        if(rand < plays.length) play = plays[rand];
        if(this.canPlay(play.x, play.y)) {
          console.log('bp');
          this.newStn(play.x, play.y);
          return true;
        }
      }
      this.randomMove();
    }

  }


  drawDotArr(arr){
    for (var i = 0; i < arr.length; i++) {
      var elem = arr[i];
      this.drawDot(elem.x, elem.y, 'rgba(0, 200, 0, 0.5)', this.cellSize/3*4);
    }
  }
  randomMove(){
    this.newStn(Math.floor(Math.random()*this.size), Math.floor(Math.random()*this.size));
  }

  doTurn(){

    if(this.mode == 'pVSia'){
      if(this.nextUp() && this.turn) this.doIA();
      else this.drawHover();
    }
    if(this.mode == 'iaVSia') if(this.nextUp()) this.doIA();
    if(this.mode == 'pVSp') this.drawHover();
    if(this.mode == 'count') {
      this.count();
      this.drawDeadHover();
    }else{
      this.displayCapt();
    }
    if(this.mode == "load" && this.autoplay && this.nextUp()){
      // chill
      this.nextTurn();
    }
  }
  endTurn(){
    if(this.turn) this.turn = 0;
    else this.turn = 1;
    this.next = 1;
    this.currTurn++;
  }

  nextTurn(){
    var p = this.getPlay(this.currGame.plays[this.currTurn]);
    this.newStn(p.x, p.y);
    document.getElementById("currTurn").value = this.currTurn;
  }

  nextUp(){
    if(Date.now() - this.lastT > this.speed){
      this.lastT = Date.now();
      return true;
    }else{
      return false;
    }
  }
}

var stnId = 0;
class Stn{
  constructor(x, y, color){
    this.x = x;
    this.y = y;
    this.id = stnId++;
    this.color = color;
    this.libs = 4;
    this.grp = 0;
    this.turn = 0;
  }
}
var grpId = 0;
class Grp{
  constructor(stnArr){
    this.stns = stnArr;
    this.id = grpId++;
    this.color = 'rgba('+Math.floor(Math.random()*256)+','+Math.floor(Math.random()*256)+','+Math.floor(Math.random()*256)+', 0.5)';
    this.init();
  }
  init(){
    for (var i = 0; i < this.stns.length; i++) {
      this.stns[i].grp = this;
    }
  }
  add(stnArr){
    for (var i = 0; i < stnArr.length; i++) {
      var s = stnArr[i];
      var alreadyIn = 0;
      for (var j = 0; j < this.stns.length; j++) {
        var ps = this.stns[i];
        if(ps.id == s.id) alreadyIn = 1;
      }
      if(!alreadyIn) this.stns.push(s);
    }
  }
}

class Game{
  constructor(b, w, rb, rw, r, k, plays){
    this.b = b;
    this.w = w;

    this.rb = parseInt(rb.replace('d',''));
    this.rw = parseInt(rb.replace('d',''));
    this.r = r;
    this.k = k;
    this.plays = plays;
    this.avg = this.rb/2 + this.rw/2;
    this.highest = this.rb;
    this.id = 0;
    if(this.rb < this.rw) this.highest = this.rw;
  }
}
function compAvg(a,b){
  if(a.avg < b.avg) return 1;
  else return -1;
}
function compHighest(a,b){
  if(a.highest < b.highest) return 1;
  else return -1;
}

function isIn(arr, value){
  for (var i = 0; i < arr.length; i++) {
    var val = arr[i];
    if(val == value) return true;
  }
  return false;
}
function libIsIn(arr, value){
  for (var i = 0; i < arr.length; i++) {
    var val = arr[i];
    if(val.x == value.x && val.y == value.y) return true;
  }
}
function toggle(value){
  if(!value) return 1;
  else return 0;
}
