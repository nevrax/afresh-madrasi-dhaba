function §\x01\x02§()
{
   return 1064 % 511 * 5;
}
var §\x01§ = 34 + "\x01\x02"();
while(true)
{
   if(eval("\x01") == 244)
   {
      set("\x01",eval("\x01") + 151);
      §§push(true);
   }
   else if(eval("\x01") == 395)
   {
      set("\x01",eval("\x01") + 351);
      if(§§pop())
      {
         set("\x01",eval("\x01") + 153);
      }
   }
   else if(eval("\x01") == 131)
   {
      set("\x01",eval("\x01") + 90);
      §§push("\x0f");
   }
   else if(eval("\x01") == 713)
   {
      set("\x01",eval("\x01") - 605);
      §§push("\x0f");
      §§push(1);
   }
   else
   {
      if(eval("\x01") == 746)
      {
         set("\x01",eval("\x01") + 153);
         §§push(§§pop() << §§pop());
         break;
      }
      if(eval("\x01") == 158)
      {
         set("\x01",eval("\x01") + 374);
         if(§§pop())
         {
            set("\x01",eval("\x01") - 20);
         }
      }
      else if(eval("\x01") == 169)
      {
         set("\x01",eval("\x01") + 544);
      }
      else if(eval("\x01") == 899)
      {
         set("\x01",eval("\x01") - 186);
      }
      else if(eval("\x01") == 108)
      {
         set("\x01",eval("\x01") + 23);
         var §§pop() = §§pop();
      }
      else if(eval("\x01") == 221)
      {
         set("\x01",eval("\x01") + 157);
         §§push(eval(§§pop()));
      }
      else
      {
         if(eval("\x01") == 512)
         {
            set("\x01",eval("\x01") - 471);
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
            break;
         }
         if(eval("\x01") == 378)
         {
            set("\x01",eval("\x01") - 220);
            §§push(!§§pop());
         }
         else
         {
            if(eval("\x01") != 532)
            {
               if(eval("\x01") == 41)
               {
                  set("\x01",eval("\x01") - 41);
               }
               break;
            }
            set("\x01",eval("\x01") - 20);
         }
      }
   }
}
