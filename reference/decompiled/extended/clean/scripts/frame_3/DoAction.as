function refreshSession()
{
   var _loc3_ = new LoadVars();
   var _loc2_ = new LoadVars();
   _loc2_.gameID = _root.gameID;
   _loc2_.sendAndLoad("/member/sess_refresh.php",_loc3_,"POST");
}
var currentLevel = 1;
var totalScore = 0;
var bMusicPlaying = true;
stop();
var sndBgMusic = new Sound();
btnUnMute._visible = false;
btnStart.onRelease = function()
{
   gotoAndStop(4);
};
refresher = setInterval(refreshSession,600000);
btnMute.onRelease = function()
{
   stopAllSounds();
   sndBgMusic.stop();
   mcRadio.gotoAndStop(1);
   mcRadio.mcSound1.gotoAndStop(1);
   mcRadio.mcSound2.gotoAndStop(1);
   bMusicPlaying = false;
   btnMute._visible = false;
   btnUnMute._visible = true;
};
btnUnMute.onRelease = function()
{
   sndBgMusic.attachSound("bgMusic" + String(random(2) + 1));
   sndBgMusic.start(0,10000);
   mcRadio.gotoAndPlay(1);
   mcRadio.mcSound1.gotoAndPlay(1);
   mcRadio.mcSound2.gotoAndPlay(1);
   bMusicPlaying = true;
   btnMute._visible = true;
   btnUnMute._visible = false;
};
