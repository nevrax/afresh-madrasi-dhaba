function CustomerMaker()
{
   var _loc3_ = 0;
   var _loc2_ = 0;
   cCount = 0;
   while(cCount < 100)
   {
      _loc3_ = random(5);
      if(_root["customer" + _loc3_]._visible == false)
      {
         break;
      }
      cCount++;
   }
   tCount = 0;
   while(tCount < 100)
   {
      _loc2_ = random(5);
      if(_root["table" + _loc2_].customerNumber == -1)
      {
         _root["customer" + _loc3_].Appear(_loc2_);
         break;
      }
      tCount++;
   }
}
function CustomerClick()
{
   var _loc3_;
   if(mouseState == STATE_DRAGGINGPLATE)
   {
      _loc3_ = Number(this._name.substr(8,1));
      this.ServeDosa(dosaCount);
      sndServe.start();
      mcPlate._x = PLATE_DEFAULT_X;
      mcPlate._y = PLATE_DEFAULT_Y;
      j = 0;
      while(j < dosaCount)
      {
         _root["dosaOnPlate" + j]._x = PLATE_DEFAULT_X;
         _root["dosaOnPlate" + j]._y = PLATE_DEFAULT_Y - j * 2;
         j++;
      }
      txtDosaCount._x = PLATE_DEFAULT_X + 35;
      txtDosaCount._y = PLATE_DEFAULT_Y - 25;
      mouseState = STATE_BLANK;
   }
}
function RemoveDosaFromPlate(cnt)
{
   i = dosaCount - cnt;
   while(i < dosaCount)
   {
      _root["dosaOnPlate" + i].removeMovieClip();
      i++;
   }
   dosaCount -= cnt;
}
function DosaMouseMove()
{
   dosaNum = Number(this._name.substr(10,2));
   if(DosaExists(dosaNum))
   {
      if(GetDosa(dosaNum)._currentframe < 160 && GetDosa(dosaNum)._currentframe > 70)
      {
         mcText._visible = true;
         mcText._x = _root["dosaHolder" + dosaNum]._x + _root["dosaHolder" + dosaNum]._width / 2;
         mcText._y = _root["dosaHolder" + dosaNum]._y;
      }
   }
}
function DosaMouseOut()
{
   mcText._visible = false;
}
function RemoveDosa(dName)
{
   mcLost._x = _root[dName]._x;
   mcLost._y = _root[dName]._y;
   mcLost._visible = true;
   mcLost.gotoAndPlay(1);
   cashCollected.text = Number(cashCollected.text) - 2;
   if(Number(cashCollected.text) < 0)
   {
      cashCollected.text = "0";
   }
   _root[dName].removeMovieClip();
}
function GetDosa(dn)
{
   return _root["dosa" + dn];
}
function DosaExists(dNum)
{
   if(_root["dosa" + dNum] != undefined)
   {
      return true;
   }
   return false;
}
function DosaClick()
{
   dosaNum = Number(this._name.substr(10,2));
   if(mouseState == STATE_HOLDINGMAVU)
   {
      if(!DosaExists(dosaNum))
      {
         mcDosa.duplicateMovieClip("dosa" + dosaNum,25 + dosaNum);
         mcDosa._x = 1000;
         mcDosa._y = 1000;
         GetDosa(dosaNum)._visible = true;
         GetDosa(dosaNum)._x = _root["dosaHolder" + dosaNum]._x;
         GetDosa(dosaNum)._y = _root["dosaHolder" + dosaNum]._y;
         GetDosa(dosaNum).thavi.gotoAndPlay(1);
         GetDosa(dosaNum).mcShadow.gotoAndPlay(1);
         GetDosa(dosaNum).gotoAndPlay(1);
         mouseState = STATE_BLANK;
      }
   }
   else if(mouseState != STATE_HOLDINGDOSA)
   {
      if(DosaExists(dosaNum))
      {
         if(GetDosa(dosaNum)._currentframe < 160 && GetDosa(dosaNum)._currentframe > 70)
         {
            GetDosa(dosaNum).gotoAndPlay("flip");
         }
         else if(GetDosa(dosaNum)._currentframe > 326 && GetDosa(dosaNum)._currentframe < 430)
         {
            GetDosa(dosaNum)._x = _xmouse;
            GetDosa(dosaNum)._y = _ymouse;
            GetDosa(dosaNum).stop();
            GetDosa(dosaNum).startDrag();
            DOSA_IN_HAND = dosaNum;
            mouseState = STATE_HOLDINGDOSA;
         }
      }
   }
}
function PlateClick()
{
   if(mouseState == STATE_HOLDINGDOSA)
   {
      GetDosa(DOSA_IN_HAND).stopDrag();
      GetDosa(DOSA_IN_HAND).stop();
      GetDosa(DOSA_IN_HAND).thavi.stop();
      GetDosa(DOSA_IN_HAND).mcShadow.stop();
      AddDosaToPlate();
      GetDosa(DOSA_IN_HAND).removeMovieClip();
      mouseState = STATE_BLANK;
   }
   else if(mouseState == STATE_BLANK)
   {
      mouseState = STATE_DRAGGINGPLATE;
   }
}
function AddDosaToPlate()
{
   var _loc2_ = GetDosa(DOSA_IN_HAND)._currentframe;
   GetDosa(DOSA_IN_HAND).duplicateMovieClip("dosaOnPlate" + dosaCount,50 + dosaCount);
   _root["dosaOnPlate" + dosaCount].gotoAndStop(_loc2_);
   _root["dosaOnPlate" + dosaCount].thavi.stop();
   _root["dosaOnPlate" + dosaCount].mcShadow.stop();
   dosaCount++;
}
function AddScore(val)
{
   cashCollected.text = Number(cashCollected.text) + val;
}
function LostCustomer()
{
   txtCustomersLost.text = Number(txtCustomersLost.text) + 1;
   if(Number(txtCustomersLost.text) > 4)
   {
      StopGame();
      totalScore = Number(cashCollected.text);
      gotoAndStop(6);
   }
}
function StopGame()
{
   clearInterval(interval_CustomerMaker);
   clearInterval(interval_TimeStep);
   i = 0;
   while(i < dosaCount)
   {
      _root["dosaOnPlate" + i].removeMovieClip();
      i++;
   }
   i = 0;
   var _loc2_;
   while(i < 5)
   {
      _loc2_ = _root["table" + i].customerNumber;
      _root["customer" + _loc2_].Initialize();
      i++;
   }
   i = 0;
   while(i < 18)
   {
      if(DosaExists(i))
      {
         GetDosa(i).removeMovieClip();
      }
      i++;
   }
}
function Mute()
{
   sndBgMusic.stop();
   mcRadio.gotoAndStop(1);
   mcRadio.mcSound1.gotoAndStop(1);
   mcRadio.mcSound2.gotoAndStop(1);
   bMusicPlaying = false;
   btnMute._visible = false;
   btnUnMute._visible = true;
}
function UnMute()
{
   sndBgMusic.stop();
   var _loc1_ = random(2) + 1;
   sndBgMusic.attachSound("bgMusic" + _loc1_);
   sndBgMusic.start(0,10000);
   mcRadio.gotoAndPlay(1);
   mcRadio.mcSound1.gotoAndPlay(1);
   mcRadio.mcSound2.gotoAndPlay(1);
   bMusicPlaying = true;
   btnMute._visible = true;
   btnUnMute._visible = false;
}
function TimeStep()
{
   clockTime++;
   mcClock.SetTime(clockTime);
   var _loc1_ = "";
   if(clockTime / 60 < 10)
   {
      _loc1_ += "0";
   }
   _loc1_ += String(Math.floor(clockTime / 60));
   _loc1_ += ":";
   if(clockTime % 60 < 10)
   {
      _loc1_ += "0";
   }
   _loc1_ += String(Math.floor(clockTime % 60));
   _loc1_ += " PM";
   txtTime.text = _loc1_;
   if(clockTime >= maxTime)
   {
      StopGame();
      totalScore = Number(cashCollected.text);
      mcDosa.removeMovieClip();
      gotoAndStop(7);
   }
}
stop();
var STATE_BLANK = 0;
var STATE_HOLDINGMAVU = 1;
var STATE_HOLDINGDOSA = 2;
var STATE_DRAGGINGPLATE = 3;
var mouseState = STATE_BLANK;
var currentDosa = 0;
var interval_CustomerMaker = 0;
var interval_TimeStep = 0;
stopAllSounds();
if(_root.bMusicPlaying)
{
   btnMute._visible = true;
   btnUnMute._visible = false;
}
else
{
   Mute();
   btnMute._visible = false;
   btnUnMute._visible = true;
}
mcText._visible = false;
mcDosa.Stop();
mcDosa._x = 1000;
mcDosa._y = 1000;
mcPlate.dosaCount = "0";
txtCustomerLost.text = "0";
dosaCount = 0;
var DOSA_IN_HAND = -1;
mcLost.stop();
mcLost._visible = false;
var PLATE_DEFAULT_X = mcPlate._x;
var PLATE_DEFAULT_Y = mcPlate._y;
txtDayNumber.text = currentLevel;
txtCashCollected.text = String(totalScore);
sndBgMusic.attachSound("bgMusic" + String(random(2) + 1));
sndBgMusic.start(0,10000);
sndBgMusic.setVolume(50);
var sndServe = new Sound();
sndServe.attachSound("serve");
var sndOrder0 = new Sound();
var sndOrder1 = new Sound();
var sndOrder2 = new Sound();
var sndOrder3 = new Sound();
var sndOrder4 = new Sound();
var clockTime = 540;
var maxTime = 720;
mcClock.SetTime(clockTime);
cashCollected.text = String(totalScore);
interval_TimeStep = setInterval(TimeStep,1000);
mcDosa.swapDepths(44);
i = 0;
while(i < 5)
{
   _root["sndOrder" + i].attachSound("order" + i);
   i++;
}
i = 0;
while(i < 18)
{
   _root["dosaHolder" + i].onRelease = DosaClick;
   _root["dosaHolder" + i].onRollOver = DosaMouseMove;
   _root["dosaHolder" + i].onRollOut = DosaMouseOut;
   i++;
}
i = 0;
while(i < 5)
{
   _root["customer" + i]._visible = false;
   _root["customer" + i].onRelease = CustomerClick;
   _root["customer" + i].Initialize();
   _root["bill" + i].stop();
   _root["bill" + i]._visible = false;
   i++;
}
i = 0;
while(i < 5)
{
   _root["table" + i].customerNumber = -1;
   i++;
}
interval_CustomerMaker = setInterval(CustomerMaker,(16 - currentLevel * 2) * 1000);
_root.onMouseMove = function()
{
   if(mouseState == STATE_HOLDINGMAVU)
   {
      mcDosa._x = _xmouse;
      mcDosa._y = _ymouse;
   }
   if(mouseState == STATE_DRAGGINGPLATE)
   {
      mcPlate._x = _xmouse;
      mcPlate._y = _ymouse + 20;
      if(mcPlate._y > Stage.height - 10)
      {
         mcPlate._y = Stage.height - 10;
      }
      j = 0;
      while(j < dosaCount)
      {
         _root["dosaOnPlate" + j]._x = _xmouse;
         _root["dosaOnPlate" + j]._y = _ymouse - j * 2 + 20;
         j++;
      }
      txtDosaCount._x = _xmouse + 35;
      txtDosaCount._y = _ymouse - 25;
   }
};
mcBG.onRelease = function()
{
   if(mouseState == STATE_HOLDINGDOSA)
   {
      GetDosa(DOSA_IN_HAND).stopDrag();
      GetDosa(DOSA_IN_HAND)._x = _root["dosaHolder" + DOSA_IN_HAND]._x;
      GetDosa(DOSA_IN_HAND)._y = _root["dosaHolder" + DOSA_IN_HAND]._y;
      GetDosa(DOSA_IN_HAND).play();
      mouseState = STATE_BLANK;
   }
   if(mouseState == STATE_HOLDINGMAVU)
   {
      mcDosa._x = 1000;
      mcDosa._y = 1000;
      mouseState = STATE_BLANK;
   }
   if(mouseState == STATE_DRAGGINGPLATE)
   {
      mcPlate._x = PLATE_DEFAULT_X;
      mcPlate._y = PLATE_DEFAULT_Y;
      j = 0;
      while(j < dosaCount)
      {
         _root["dosaOnPlate" + j]._x = PLATE_DEFAULT_X;
         _root["dosaOnPlate" + j]._y = PLATE_DEFAULT_Y - j * 2;
         j++;
      }
      txtDosaCount._x = PLATE_DEFAULT_X + 35;
      txtDosaCount._y = PLATE_DEFAULT_Y - 25;
      mouseState = STATE_BLANK;
   }
   mouseState = STATE_BLANK;
};
mcMavu.onRelease = function()
{
   if(mouseState == STATE_BLANK)
   {
      mcDosa.gotoAndStop(1);
      mcDosa.thavi.gotoAndStop(1);
      mcDosa.mcShadow.gotoAndStop(1);
      mcDosa._x = _xmouse;
      mcDosa._y = _ymouse;
      mouseState = STATE_HOLDINGMAVU;
   }
};
mcPlate.onRelease = PlateClick;
btnMute.onRelease = Mute;
btnUnMute.onRelease = UnMute;
