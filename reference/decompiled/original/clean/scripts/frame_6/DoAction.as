function checkForm()
{
   SubmitScore(_root.gameID,_root.tourID,String(totalScore),String(totalPoints));
}
function SubmitScore(gid, tourid, score, points)
{
   var _loc4_ = new Rijndael(128,128);
   var _loc6_ = "katUnzI$n0wcH@y03ot3c#N0$oluT10n$";
   var _loc2_ = new LoadVars();
   var _loc1_ = new LoadVars();
   _loc1_.gameID = gid;
   _loc1_.tourID = tourid;
   _loc1_.playerPoint = points;
   _loc1_.playerScore = score;
   trace("Score" + _loc1_.playerScore);
   trace("Point" + _loc1_.playerPoint);
   var _loc5_ = _loc1_.playerScore + "|" + _loc1_.playerPoint + "|" + _loc1_.gameID;
   var _loc3_ = _loc4_.encrypt(_loc5_,_loc6_);
   _loc1_.verify = _loc3_;
   if(tourid != 0)
   {
      _loc1_.sendAndLoad("/member/tournamentscore.php",_loc2_,"POST");
   }
   else
   {
      _loc1_.sendAndLoad("/member/setscore.php",_loc2_,"POST");
   }
}
stop();
stopAllSounds();
txtNetCollection.text = String(totalScore + "/-");
var totalPoints = Number(currentLevel - 1);
getURL("javascript:callAjax(" + totalScore + "," + totalPoints + ")","");
if(!scoreSend)
{
   scoreSend = true;
   checkForm();
}
btnTryAgain.onRelease = function()
{
   totalScore = 0;
   currentLevel = 1;
   gotoAndStop(5);
};
