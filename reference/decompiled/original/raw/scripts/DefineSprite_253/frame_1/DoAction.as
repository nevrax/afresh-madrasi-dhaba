function §\x01\x02§()
{
   return 802 % 511 * 5;
}
var §\x01§ = -855 + "\x01\x02"();
while(true)
{
   if(eval("\x01") == 600)
   {
      set("\x01",eval("\x01") + 329);
      §§push(true);
   }
   else if(eval("\x01") == 929)
   {
      set("\x01",eval("\x01") - 2);
      if(§§pop())
      {
         set("\x01",eval("\x01") - 712);
      }
   }
   else if(eval("\x01") == 268)
   {
      set("\x01",eval("\x01") + 477);
      var §§pop() = §§pop();
   }
   else if(eval("\x01") == 979)
   {
      set("\x01",eval("\x01") - 711);
      §§push("\x0f");
      §§push(1);
   }
   else if(eval("\x01") == 496)
   {
      set("\x01",eval("\x01") + 103);
      §§push(!§§pop());
   }
   else
   {
      if(eval("\x01") == 927)
      {
         set("\x01",eval("\x01") - 712);
         break;
      }
      if(eval("\x01") == 215)
      {
         set("\x01",eval("\x01") + 349);
      }
      else if(eval("\x01") == 878)
      {
         set("\x01",eval("\x01") - 382);
         §§push(eval(§§pop()));
      }
      else if(eval("\x01") == 935)
      {
         set("\x01",eval("\x01") - 178);
         if(§§pop())
         {
            set("\x01",eval("\x01") + 199);
         }
      }
      else if(eval("\x01") == 745)
      {
         set("\x01",eval("\x01") + 133);
         §§push("\x0f");
      }
      else if(eval("\x01") == 824)
      {
         set("\x01",eval("\x01") + 155);
      }
      else if(eval("\x01") == 961)
      {
         set("\x01",eval("\x01") - 397);
      }
      else if(eval("\x01") == 599)
      {
         set("\x01",eval("\x01") + 103);
         if(§§pop())
         {
            set("\x01",eval("\x01") + 235);
         }
      }
      else if(eval("\x01") == 702)
      {
         set("\x01",eval("\x01") + 235);
      }
      else
      {
         if(eval("\x01") == 937)
         {
            set("\x01",eval("\x01") + 52);
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
               _root["sndOrder" + cn].start();
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
         if(eval("\x01") == 564)
         {
            set("\x01",eval("\x01") + 371);
            §§push(true);
         }
         else
         {
            if(eval("\x01") == 757)
            {
               set("\x01",eval("\x01") + 199);
               break;
            }
            if(eval("\x01") != 956)
            {
               if(eval("\x01") == 989)
               {
                  set("\x01",eval("\x01") - 989);
               }
               break;
            }
            set("\x01",eval("\x01") + 23);
         }
      }
   }
}
