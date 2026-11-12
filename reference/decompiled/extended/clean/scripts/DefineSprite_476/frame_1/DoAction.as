function SetTime(tm)
{
   var _loc2_ = Math.floor(tm / 60);
   var _loc1_ = tm % 60;
   needleMinute._rotation = _loc1_ * 6 - 90;
   needleHour._rotation = _loc2_ * 30 + _loc1_ * 0.5 - 90;
}
