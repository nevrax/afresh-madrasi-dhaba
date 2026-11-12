function refreshSession()
{
   var _loc3_ = new LoadVars();
   var _loc2_ = new LoadVars();
   _loc2_.gameID = _root.gameID;
   _loc2_.sendAndLoad("/member/sess_refresh.php",_loc3_,"POST");
}
stopAllSounds();
txtNetCollection.text = String(totalScore + "/-");
btnTomorrow.onRelease = function()
{
   currentLevel++;
   refreshSession();
   gotoAndStop(5);
};
