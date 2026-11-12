function §\x01\x02§()
{
   return 506 % 511 * 5;
}
var §\x01§ = -2010 + "\x01\x02"();
while(true)
{
   if(eval("\x01") == 520)
   {
      set("\x01",eval("\x01") - 144);
      §§push(true);
   }
   else if(eval("\x01") == 89)
   {
      set("\x01",eval("\x01") - 85);
   }
   else if(eval("\x01") == 559)
   {
      set("\x01",eval("\x01") + 362);
   }
   else if(eval("\x01") == 179)
   {
      set("\x01",eval("\x01") + 204);
   }
   else if(eval("\x01") == 4)
   {
      set("\x01",eval("\x01") + 736);
      §§push(true);
   }
   else if(eval("\x01") == 389)
   {
      set("\x01",eval("\x01") + 83);
      if(§§pop())
      {
         set("\x01",eval("\x01") + 245);
      }
   }
   else if(eval("\x01") == 740)
   {
      set("\x01",eval("\x01") + 79);
      if(§§pop())
      {
         set("\x01",eval("\x01") - 279);
      }
   }
   else if(eval("\x01") == 632)
   {
      set("\x01",eval("\x01") - 145);
      §§push(eval(§§pop()));
   }
   else if(eval("\x01") == 717)
   {
      set("\x01",eval("\x01") - 713);
   }
   else
   {
      if(eval("\x01") == 819)
      {
         set("\x01",eval("\x01") - 279);
         break;
      }
      if(eval("\x01") == 383)
      {
         set("\x01",eval("\x01") + 6);
         §§push(true);
      }
      else if(eval("\x01") == 208)
      {
         set("\x01",eval("\x01") + 595);
      }
      else
      {
         if(eval("\x01") == 472)
         {
            set("\x01",eval("\x01") + 245);
            break;
         }
         if(eval("\x01") == 102)
         {
            set("\x01",eval("\x01") + 106);
            if(§§pop())
            {
               set("\x01",eval("\x01") + 595);
            }
         }
         else
         {
            if(eval("\x01") == 803)
            {
               set("\x01",eval("\x01") + 100);
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
               stopAllSounds();
               var STATE_BLANK = 0;
               var STATE_HOLDINGMAVU = 1;
               var STATE_HOLDINGDOSA = 2;
               var STATE_DRAGGINGPLATE = 3;
               var mouseState = STATE_BLANK;
               var currentDosa = 0;
               var interval_CustomerMaker = 0;
               var interval_TimeStep = 0;
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
               var bMusicPlaying = true;
               txtDayNumber.text = currentLevel;
               txtCashCollected.text = String(totalScore);
               var sndBgMusic = new Sound();
               sndBgMusic.attachSound("bgMusic" + String(random(3) + 1));
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
               set(§§constant(24),0);
               while(eval(§§constant(24)) < 5)
               {
                  eval(§§constant(91))[§§constant(4) + eval(§§constant(24))][§§constant(5)] = -1;
                  set(§§constant(24),eval(§§constant(24)) + 1);
               }
               set(§§constant(56),§§constant(88)(eval(§§constant(101)),(16 - eval(§§constant(74)) * 2) * 1000));
               eval(§§constant(91))[§§constant(102)] = function()
               {
                  if(eval(§§constant(7)) == eval(§§constant(39)))
                  {
                     eval(§§constant(40))[§§constant(16)] = getProperty(§§constant(46), _xmouse);
                     eval(§§constant(40))[§§constant(18)] = getProperty(§§constant(46), _ymouse);
                  }
                  if(eval(§§constant(7)) == eval(§§constant(8)))
                  {
                     eval(§§constant(15))[§§constant(16)] = getProperty(§§constant(46), _xmouse);
                     eval(§§constant(15))[§§constant(18)] = getProperty(§§constant(46), _ymouse) + 20;
                     if(eval(§§constant(15))[§§constant(18)] > eval(§§constant(103))[§§constant(104)] - 10)
                     {
                        eval(§§constant(15))[§§constant(18)] = eval(§§constant(103))[§§constant(104)] - 10;
                     }
                     set(§§constant(20),0);
                     while(eval(§§constant(20)) < eval(§§constant(11)))
                     {
                        _root[§§constant(21) + eval(§§constant(20))][§§constant(16)] = getProperty(§§constant(46), _xmouse);
                        _root[§§constant(21) + eval(§§constant(20))][§§constant(18)] = getProperty(§§constant(46), _ymouse) - eval(§§constant(20)) * 2 + 20;
                        set(§§constant(20),eval(§§constant(20)) + 1);
                     }
                     eval(§§constant(22))[§§constant(16)] = getProperty(§§constant(46), _xmouse) + 35;
                     eval(§§constant(22))[§§constant(18)] = getProperty(§§constant(46), _ymouse) - 25;
                  }
               };
               eval(§§constant(105))[§§constant(93)] = function()
               {
                  if(eval(§§constant(7)) == eval(§§constant(44)))
                  {
                     §§constant(28)(eval(§§constant(49)))[§§constant(50)]();
                     §§constant(28)(eval(§§constant(49)))[§§constant(16)] = _root[§§constant(31) + eval(§§constant(49))][§§constant(16)];
                     §§constant(28)(eval(§§constant(49)))[§§constant(18)] = _root[§§constant(31) + eval(§§constant(49))][§§constant(18)];
                     §§constant(28)(eval(§§constant(49)))[§§constant(106)]();
                     set(§§constant(7),eval(§§constant(23)));
                  }
                  if(eval(§§constant(7)) == eval(§§constant(39)))
                  {
                     eval(§§constant(40))[§§constant(16)] = 1000;
                     eval(§§constant(40))[§§constant(18)] = 1000;
                     set(§§constant(7),eval(§§constant(23)));
                  }
                  if(eval(§§constant(7)) == eval(§§constant(8)))
                  {
                     eval(§§constant(15))[§§constant(16)] = eval(§§constant(17));
                     eval(§§constant(15))[§§constant(18)] = eval(§§constant(19));
                     set(§§constant(20),0);
                     while(eval(§§constant(20)) < eval(§§constant(11)))
                     {
                        _root[§§constant(21) + eval(§§constant(20))][§§constant(16)] = eval(§§constant(17));
                        _root[§§constant(21) + eval(§§constant(20))][§§constant(18)] = eval(§§constant(19)) - eval(§§constant(20)) * 2;
                        set(§§constant(20),eval(§§constant(20)) + 1);
                     }
                     eval(§§constant(22))[§§constant(16)] = eval(§§constant(17)) + 35;
                     eval(§§constant(22))[§§constant(18)] = eval(§§constant(19)) - 25;
                     set(§§constant(7),eval(§§constant(23)));
                  }
                  set(§§constant(7),eval(§§constant(23)));
               };
               eval(§§constant(107))[§§constant(93)] = function()
               {
                  if(eval(§§constant(7)) == eval(§§constant(23)))
                  {
                     eval(§§constant(40))[§§constant(52)](1);
                     eval(§§constant(40))[§§constant(42)][§§constant(52)](1);
                     eval(§§constant(40))[§§constant(43)][§§constant(52)](1);
                     eval(§§constant(40))[§§constant(16)] = getProperty(§§constant(46), _xmouse);
                     eval(§§constant(40))[§§constant(18)] = getProperty(§§constant(46), _ymouse);
                     set(§§constant(7),eval(§§constant(39)));
                  }
               };
               eval(§§constant(15))[§§constant(93)] = eval(§§constant(108));
               eval(§§constant(109))[§§constant(93)] = function()
               {
                  if(eval(§§constant(72)))
                  {
                     eval(§§constant(76))[§§constant(47)]();
                     eval(§§constant(109))[§§constant(52)](1);
                     eval(§§constant(109))[§§constant(110)][§§constant(52)](1);
                     eval(§§constant(109))[§§constant(111)][§§constant(52)](1);
                     set(§§constant(72),false);
                  }
                  else
                  {
                     eval(§§constant(76))[§§constant(79)](§§constant(78) + String(random(3) + 1));
                     eval(§§constant(76))[§§constant(14)](0,10000);
                     eval(§§constant(109))[§§constant(34)](1);
                     eval(§§constant(109))[§§constant(110)][§§constant(34)](1);
                     eval(§§constant(109))[§§constant(111)][§§constant(34)](1);
                     set(§§constant(72),true);
                  }
               };
               break;
            }
            if(eval("\x01") == 376)
            {
               set("\x01",eval("\x01") + 3);
               if(§§pop())
               {
                  set("\x01",eval("\x01") - 200);
               }
            }
            else if(eval("\x01") == 487)
            {
               set("\x01",eval("\x01") - 385);
               §§push(!§§pop());
            }
            else if(eval("\x01") == 298)
            {
               set("\x01",eval("\x01") + 334);
               §§push("\x0f");
            }
            else
            {
               if(eval("\x01") == 903)
               {
                  set("\x01",eval("\x01") - 903);
                  break;
               }
               if(eval("\x01") == 149)
               {
                  set("\x01",eval("\x01") + 234);
               }
               else
               {
                  if(eval("\x01") == 379)
                  {
                     set("\x01",eval("\x01") - 200);
                     §§push(§§pop() == §§pop());
                     break;
                  }
                  if(eval("\x01") == 286)
                  {
                     set("\x01",eval("\x01") + 12);
                     var §§pop() = §§pop();
                  }
                  else if(eval("\x01") == 540)
                  {
                     set("\x01",eval("\x01") + 381);
                  }
                  else
                  {
                     if(eval("\x01") != 921)
                     {
                        break;
                     }
                     set("\x01",eval("\x01") - 635);
                     §§push("\x0f");
                     §§push(1);
                  }
               }
            }
         }
      }
   }
}
