var loadedByt = _root.getBytesLoaded();
var totalByt = _root.getBytesTotal();
var percByt = loadedByt / totalByt;
var currentFrm = outerloader.innerloader._currentframe;
var totalFrm = outerloader.innerloader._totalframes;
var speed = Math.ceil(totalFrm * percByt);
if(speed > currentFrm)
{
   outerloader.innerloader.play();
   progress_mc.play();
}
else
{
   progress_mc.stop();
   outerloader.innerloader.stop();
}
perTxt = Math.round(currentFrm / totalFrm * 100);
loadText = perTxt;
if(Number(perTxt) >= 100)
{
   gotoAndStop(3);
}
else
{
   gotoAndPlay(1);
}
var my_cm = new ContextMenu();
_root.my_cm.hideBuiltInItems();
_root.menu = my_cm;
