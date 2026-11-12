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
