function §\x01\x02§()
{
   return 2306 % 511 * 5;
}
var §\x01§ = -1094 + "\x01\x02"();
while(true)
{
   if(eval("\x01") == 216)
   {
      set("\x01",eval("\x01") + 51);
      §§push(true);
   }
   else if(eval("\x01") == 194)
   {
      set("\x01",eval("\x01") + 698);
      if(§§pop())
      {
         set("\x01",eval("\x01") - 881);
      }
   }
   else if(eval("\x01") == 951)
   {
      set("\x01",eval("\x01") - 19);
      §§push("\x0f");
   }
   else if(eval("\x01") == 237)
   {
      set("\x01",eval("\x01") + 14);
   }
   else if(eval("\x01") == 892)
   {
      set("\x01",eval("\x01") - 881);
   }
   else if(eval("\x01") == 489)
   {
      set("\x01",eval("\x01") - 238);
   }
   else if(eval("\x01") == 932)
   {
      set("\x01",eval("\x01") - 400);
      §§push(eval(§§pop()));
   }
   else
   {
      if(eval("\x01") == 612)
      {
         set("\x01",eval("\x01") - 123);
         break;
      }
      if(eval("\x01") != 532)
      {
         if(eval("\x01") == 11)
         {
            set("\x01",eval("\x01") + 382);
            function Initialize()
            {
               clearInterval(patienceTimer);
               clearInterval(orderTimer);
               patienceTimer = 0;
               orderTimer = 0;
               character.gotoAndStop(1);
               mcOrder._visible = false;
               mcExit._visible = true;
               character._visible = false;
               earSmokeLeft._visible = false;
               earSmokeRight._visible = false;
            }
            function CheckComplete()
            {
               eat_action_count++;
               if(eat_action_count >= customerDosa * 3)
               {
                  GoHappy();
               }
            }
            function OrderDosa(cn)
            {
               clearInterval(orderTimer);
               mcOrder.orderCount = random(4) + 1;
               mcOrder._visible = true;
               mcOrder.play();
               patienceTimer = setInterval(ManageTemper,100);
               mcOrder.patienceMeter.patienceMasker._y = -66;
               if(_root.bMusicPlaying)
               {
                  _root["sndOrder" + cn].start();
               }
            }
            function ManageTemper(mc)
            {
               mcOrder.patienceMeter.patienceMasker._y += 0.2;
               if(mcOrder.patienceMeter.patienceMasker._y >= -30)
               {
                  OutOfPatience();
               }
               else if(mcOrder.patienceMeter.patienceMasker._y > -40 && !earSmokeLeft._visible)
               {
                  earSmokeLeft._visible = true;
                  earSmokeRight._visible = true;
                  earSmokeLeft.gotoAndPlay(1);
                  earSmokeRight.gotoAndPlay(1);
               }
            }
            function OutOfPatience()
            {
               clearInterval(patienceTimer);
               clearInterval(orderTimer);
               patienceTimer = 0;
               orderTimer = 0;
               mcOrder._visible = false;
               mcExit._visible = true;
               character._visible = false;
               earSmokeLeft._visible = false;
               earSmokeRight._visible = false;
               _parent.LostCustomer();
               mcExit.gotoAndPlay(1);
            }
            function GoHappy()
            {
               clearInterval(patienceTimer);
               clearInterval(orderTimer);
               patienceTimer = 0;
               orderTimer = 0;
               character.gotoAndStop(1);
               mcOrder._visible = false;
               mcExit._visible = true;
               character._visible = false;
               earSmokeLeft._visible = false;
               earSmokeRight._visible = false;
               mcExit.gotoAndPlay(1);
               var _loc4_ = customerDosa * 2;
               var _loc5_ = Number(this._name.substr(8,1));
               _root["bill" + tableNumber].txtBill.text = "Rs." + _loc4_ + "/-";
               _root["bill" + tableNumber]._visible = true;
               _root["bill" + tableNumber].gotoAndPlay(1);
               _parent.AddScore(_loc4_);
            }
         }
         else
         {
            if(eval("\x01") == 312)
            {
               set("\x01",eval("\x01") + 639);
               var §§pop() = §§pop();
               continue;
            }
            if(eval("\x01") == 857)
            {
               set("\x01",eval("\x01") - 245);
               if(§§pop())
               {
                  set("\x01",eval("\x01") - 123);
               }
               continue;
            }
            if(eval("\x01") != 725)
            {
               if(eval("\x01") == 251)
               {
                  set("\x01",eval("\x01") + 61);
                  §§push("\x0f");
                  §§push(1);
               }
               else
               {
                  if(eval("\x01") == 393)
                  {
                     set("\x01",eval("\x01") - 393);
                     break;
                  }
                  if(eval("\x01") == 481)
                  {
                     set("\x01",eval("\x01") + 376);
                     §§push(true);
                  }
                  else if(eval("\x01") == 525)
                  {
                     set("\x01",eval("\x01") - 44);
                  }
                  else if(eval("\x01") == 9)
                  {
                     set("\x01",eval("\x01") + 472);
                  }
                  else
                  {
                     if(eval("\x01") != 267)
                     {
                        break;
                     }
                     set("\x01",eval("\x01") + 458);
                     if(§§pop())
                     {
                        set("\x01",eval("\x01") - 716);
                     }
                  }
               }
               continue;
            }
            set("\x01",eval("\x01") - 716);
            toggleHighQuality();
            nextFrame();
            nextFrame();
            §§pop()[§§pop()] = §§pop() + §§pop() + "/-";
            _root["bill" + tableNumber]._visible = true;
            _root["bill" + tableNumber].gotoAndPlay(1);
            _parent.AddScore(_loc4_);
         }
         function Disappear()
         {
            this._visible = false;
            _root["table" + tableNumber].customerNumber = -1;
         }
         function ServeDosa(dCount)
         {
            if(!mcOrder._visible)
            {
               return undefined;
            }
            mcOrder.patienceMeter.patienceMasker._y -= dCount * 6;
            if(dCount >= Number(mcOrder.orderCount))
            {
               _parent.RemoveDosaFromPlate(Number(mcOrder.orderCount));
               customerDosa += Number(mcOrder.orderCount);
               clearInterval(patienceTimer);
               earSmokeLeft._visible = false;
               earSmokeRight._visible = false;
               mcOrder._visible = false;
               character.play();
            }
            else
            {
               customerDosa += dCount;
               mcOrder.orderCount = Number(mcOrder.orderCount) - dCount;
               _parent.RemoveDosaFromPlate(dCount);
            }
         }
         function StartOrderTimer(mSec)
         {
            var _loc2_ = Number(this._name.substr(8,1));
            orderTimer = setInterval(OrderDosa,mSec,_loc2_);
         }
         function Appear(tableNum)
         {
            this._x = _root["table" + tableNum]._x;
            this._y = _root["table" + tableNum]._y - 40;
            _root["table" + tableNum].customerNumber = Number(this._name.substr(8,1));
            tableNumber = tableNum;
            customerDosa = 0;
            eat_action_count = 0;
            mcOrder._visible = false;
            earSmokeLeft._visible = false;
            earSmokeRight._visible = false;
            mcExit.gotoAndStop(1);
            mcExit._visible = false;
            character._visible = true;
            character.stop();
            this._visible = true;
            character._visible = true;
            this.StartOrderTimer(2000);
         }
         stop();
         character.stop();
         var customerDosa = 0;
         var eat_action_count = 0;
         var patienceTimer = 0;
         var orderTimer = 0;
         var tableNumber = 0;
         break;
      }
      set("\x01",eval("\x01") - 338);
      §§push(!§§pop());
   }
}
