mcInstruction._visible = false;
btnPlay.onRelease = function()
{
   gotoAndStop(5);
};
btnHowToPlay.onRelease = function()
{
   mcInstruction._visible = true;
   mcInstruction.gotoAndPlay(1);
};
