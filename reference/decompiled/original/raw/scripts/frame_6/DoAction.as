function §\x01\x02§()
{
   return 1166 % 511 * 5;
}
var §\x01§ = -321 + "\x01\x02"();
while(true)
{
   if(eval("\x01") == 399)
   {
      set("\x01",eval("\x01") + 503);
      §§push(true);
   }
   else if(eval("\x01") == 422)
   {
      set("\x01",eval("\x01") + 7);
   }
   else if(eval("\x01") == 394)
   {
      set("\x01",eval("\x01") + 62);
      §§push(true);
   }
   else
   {
      if(eval("\x01") == 643)
      {
         set("\x01",eval("\x01") + 207);
         startDrag(§§pop(),§§pop(),§§pop(),§§pop(),§§pop(),§§pop());
         break;
      }
      if(eval("\x01") == 902)
      {
         set("\x01",eval("\x01") - 259);
         if(§§pop())
         {
            set("\x01",eval("\x01") + 207);
         }
      }
      else if(eval("\x01") == 65)
      {
         set("\x01",eval("\x01") + 329);
      }
      else if(eval("\x01") == 850)
      {
         set("\x01",eval("\x01") - 421);
      }
      else if(eval("\x01") == 704)
      {
         set("\x01",eval("\x01") - 669);
         §§push(eval(§§pop()));
      }
      else
      {
         if(eval("\x01") == 128)
         {
            set("\x01",eval("\x01") + 556);
            break;
         }
         if(eval("\x01") == 684)
         {
            set("\x01",eval("\x01") - 290);
         }
         else if(eval("\x01") == 640)
         {
            set("\x01",eval("\x01") - 512);
            if(§§pop())
            {
               set("\x01",eval("\x01") + 556);
            }
         }
         else if(eval("\x01") == 429)
         {
            set("\x01",eval("\x01") + 211);
            §§push(true);
         }
         else
         {
            if(eval("\x01") == 256)
            {
               set("\x01",eval("\x01") + 557);
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
               break;
            }
            if(eval("\x01") == 306)
            {
               set("\x01",eval("\x01") - 50);
            }
            else if(eval("\x01") == 456)
            {
               set("\x01",eval("\x01") + 54);
               if(§§pop())
               {
                  set("\x01",eval("\x01") - 297);
               }
            }
            else if(eval("\x01") == 831)
            {
               set("\x01",eval("\x01") - 32);
               §§push("\x0f");
               §§push(1);
            }
            else
            {
               if(eval("\x01") == 510)
               {
                  set("\x01",eval("\x01") - 297);
                  break;
               }
               if(eval("\x01") == 213)
               {
                  set("\x01",eval("\x01") + 618);
               }
               else if(eval("\x01") == 540)
               {
                  set("\x01",eval("\x01") + 291);
               }
               else if(eval("\x01") == 604)
               {
                  set("\x01",eval("\x01") + 100);
                  §§push("\x0f");
               }
               else if(eval("\x01") == 799)
               {
                  set("\x01",eval("\x01") - 195);
                  var §§pop() = §§pop();
               }
               else if(eval("\x01") == 35)
               {
                  set("\x01",eval("\x01") + 397);
                  §§push(!§§pop());
               }
               else
               {
                  if(eval("\x01") != 432)
                  {
                     if(eval("\x01") == 813)
                     {
                        set("\x01",eval("\x01") - 813);
                     }
                     break;
                  }
                  set("\x01",eval("\x01") - 126);
                  if(§§pop())
                  {
                     set("\x01",eval("\x01") - 50);
                  }
               }
            }
         }
      }
   }
}
