function refreshSession()
{
   var _loc3_ = new LoadVars();
   var _loc2_ = new LoadVars();
   _loc2_.gameID = _root.gameID;
   _loc2_.sendAndLoad("/member/sess_refresh.php",_loc3_,"POST");
}
var currentLevel = 1;
var totalScore = 0;
stop();
btnStart.onRelease = function()
{
   gotoAndStop(4);
};
refresher = setInterval(refreshSession,600000);
