function §\x01\x02§()
{
   return 2890 % 511 * 5;
}
var §\x01§ = -1116 + "\x01\x02"();
while(true)
{
   if(eval("\x01") == 559)
   {
      set("\x01",eval("\x01") - 402);
      §§push(true);
   }
   else if(eval("\x01") == 92)
   {
      set("\x01",eval("\x01") + 51);
      §§push(true);
   }
   else if(eval("\x01") == 530)
   {
      set("\x01",eval("\x01") - 39);
   }
   else if(eval("\x01") == 719)
   {
      set("\x01",eval("\x01") - 714);
      if(§§pop())
      {
         set("\x01",eval("\x01") + 38);
      }
   }
   else
   {
      if(eval("\x01") != 882)
      {
         if(eval("\x01") == 5)
         {
            set("\x01",eval("\x01") + 38);
         }
         else
         {
            if(eval("\x01") == 109)
            {
               set("\x01",eval("\x01") + 369);
               §§push("\x0f");
               §§push(1);
               continue;
            }
            if(eval("\x01") == 38)
            {
               set("\x01",eval("\x01") + 650);
               §§push(eval(§§pop()));
               continue;
            }
            if(eval("\x01") == 491)
            {
               set("\x01",eval("\x01") - 488);
               if(!_global.mx)
               {
                  _global.mx = new Object();
               }
               §§pop();
               if(!_global.mx.events)
               {
                  _global.mx.events = new Object();
               }
               §§pop();
               if(!_global.mx.events.UIEventDispatcher)
               {
                  mx.events.UIEventDispatcher = function()
                  {
                     super();
                  }.addKeyEvents = function(obj)
                  {
                     var _loc0_;
                     var _loc1_;
                     if(obj.keyHandler == undefined)
                     {
                        _loc1_ = obj.keyHandler = new Object();
                        _loc1_.owner = obj;
                        _loc1_.onKeyDown = mx.events.UIEventDispatcher._fEventDispatcher.onKeyDown;
                        _loc1_.onKeyUp = mx.events.UIEventDispatcher._fEventDispatcher.onKeyUp;
                     }
                     Key.addListener(obj.keyHandler);
                  };
                  mx.events.UIEventDispatcher = function()
                  {
                     super();
                  }.removeKeyEvents = function(obj)
                  {
                     Key.removeListener(obj.keyHandler);
                  };
                  mx.events.UIEventDispatcher = function()
                  {
                     super();
                  }.addLoadEvents = function(obj)
                  {
                     if(obj.onLoad == undefined)
                     {
                        obj.onLoad = mx.events.UIEventDispatcher._fEventDispatcher.onLoad;
                        obj.onUnload = mx.events.UIEventDispatcher._fEventDispatcher.onUnload;
                        if(obj.getBytesTotal() == obj.getBytesLoaded())
                        {
                           obj.doLater(obj,"onLoad");
                        }
                     }
                  };
                  mx.events.UIEventDispatcher = function()
                  {
                     super();
                  }.removeLoadEvents = function(obj)
                  {
                     delete obj.onLoad;
                     delete obj.onUnload;
                  };
                  mx.events.UIEventDispatcher = function()
                  {
                     super();
                  }.initialize = function(obj)
                  {
                     if(mx.events.UIEventDispatcher._fEventDispatcher == undefined)
                     {
                        mx.events.UIEventDispatcher._fEventDispatcher = new mx.events.UIEventDispatcher();
                     }
                     obj.addEventListener = mx.events.UIEventDispatcher._fEventDispatcher.__addEventListener;
                     obj.__origAddEventListener = mx.events.UIEventDispatcher._fEventDispatcher.addEventListener;
                     obj.removeEventListener = mx.events.UIEventDispatcher._fEventDispatcher.removeEventListener;
                     obj.dispatchEvent = mx.events.UIEventDispatcher._fEventDispatcher.dispatchEvent;
                     obj.dispatchQueue = mx.events.UIEventDispatcher._fEventDispatcher.dispatchQueue;
                  };
                  mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().dispatchEvent = function(eventObj)
                  {
                     if(eventObj.target == undefined)
                     {
                        eventObj.target = this;
                     }
                     this[eventObj.type + "Handler"](eventObj);
                     this.dispatchQueue(mx.events.EventDispatcher,eventObj);
                     this.dispatchQueue(this,eventObj);
                  };
                  mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().onKeyDown = function(Void)
                  {
                     this.owner.dispatchEvent({type:"keyDown",code:Key.getCode(),ascii:Key.getAscii(),shiftKey:Key.isDown(16),ctrlKey:Key.isDown(17)});
                  };
                  mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().onKeyUp = function(Void)
                  {
                     this.owner.dispatchEvent({type:"keyUp",code:Key.getCode(),ascii:Key.getAscii(),shiftKey:Key.isDown(16),ctrlKey:Key.isDown(17)});
                  };
                  mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().onLoad = function(Void)
                  {
                     if(this.__sentLoadEvent != true)
                     {
                        this.dispatchEvent({type:"load"});
                     }
                     this.__sentLoadEvent = true;
                  };
                  mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().onUnload = function(Void)
                  {
                     this.dispatchEvent({type:"unload"});
                  };
                  mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().__addEventListener = function(event, handler)
                  {
                     this.__origAddEventListener(event,handler);
                     var _loc3_ = mx.events.UIEventDispatcher.lowLevelEvents;
                     var _loc2_;
                     for(var _loc5_ in _loc3_)
                     {
                        if(mx.events.UIEventDispatcher[_loc5_][event] != undefined)
                        {
                           _loc2_ = _loc3_[_loc5_][0];
                           mx.events.UIEventDispatcher[_loc2_](this);
                        }
                     }
                  };
                  mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().removeEventListener = function(event, handler)
                  {
                     var _loc6_ = "__q_" + event;
                     mx.events.EventDispatcher._removeEventListener(this[_loc6_],event,handler);
                     var _loc2_;
                     var _loc3_;
                     if(this[_loc6_].length == 0)
                     {
                        _loc2_ = mx.events.UIEventDispatcher.lowLevelEvents;
                        for(var _loc5_ in _loc2_)
                        {
                           if(mx.events.UIEventDispatcher[_loc5_][event] != undefined)
                           {
                              _loc3_ = _loc2_[_loc5_][1];
                              mx.events.UIEventDispatcher[_loc2_[_loc5_][1]](this);
                           }
                        }
                     }
                  };
                  mx.events.UIEventDispatcher = function()
                  {
                     super();
                  }.keyEvents = {keyDown:1,keyUp:1};
                  mx.events.UIEventDispatcher = function()
                  {
                     super();
                  }.loadEvents = {load:1,unload:1};
                  mx.events.UIEventDispatcher = function()
                  {
                     super();
                  }.lowLevelEvents = {keyEvents:["addKeyEvents","removeKeyEvents"],loadEvents:["addLoadEvents","removeLoadEvents"]};
                  mx.events.UIEventDispatcher = function()
                  {
                     super();
                  }._fEventDispatcher = undefined;
                  §§push(ASSetPropFlags(mx.events.UIEventDispatcher.prototype,null,1));
               }
               §§pop();
               break;
            }
            if(eval("\x01") == 143)
            {
               set("\x01",eval("\x01") + 368);
               if(§§pop())
               {
                  set("\x01",eval("\x01") + 86);
               }
               continue;
            }
            if(eval("\x01") == 3)
            {
               set("\x01",eval("\x01") - 3);
               break;
            }
            if(eval("\x01") == 363)
            {
               set("\x01",eval("\x01") - 271);
               continue;
            }
            if(eval("\x01") == 511)
            {
               set("\x01",eval("\x01") + 86);
               break;
            }
            if(eval("\x01") == 175)
            {
               set("\x01",eval("\x01") + 707);
               continue;
            }
            if(eval("\x01") == 597)
            {
               set("\x01",eval("\x01") - 254);
               continue;
            }
            if(eval("\x01") == 130)
            {
               set("\x01",eval("\x01") - 38);
               continue;
            }
            if(eval("\x01") == 908)
            {
               set("\x01",eval("\x01") - 26);
               continue;
            }
            if(eval("\x01") == 973)
            {
               set("\x01",eval("\x01") - 630);
               continue;
            }
            if(eval("\x01") == 43)
            {
               set("\x01",eval("\x01") + 66);
               continue;
            }
            if(eval("\x01") == 690)
            {
               set("\x01",eval("\x01") - 652);
               §§push("\x0f");
               continue;
            }
            if(eval("\x01") == 40)
            {
               set("\x01",eval("\x01") + 69);
               continue;
            }
            if(eval("\x01") == 343)
            {
               set("\x01",eval("\x01") + 402);
               §§push(true);
               continue;
            }
            if(eval("\x01") != 163)
            {
               if(eval("\x01") == 178)
               {
                  set("\x01",eval("\x01") + 352);
                  if(§§pop())
                  {
                     set("\x01",eval("\x01") - 39);
                  }
               }
               else if(eval("\x01") == 478)
               {
                  set("\x01",eval("\x01") + 212);
                  var §§pop() = §§pop();
               }
               else
               {
                  if(eval("\x01") == 272)
                  {
                     set("\x01",eval("\x01") - 142);
                     break;
                  }
                  if(eval("\x01") == 745)
                  {
                     set("\x01",eval("\x01") - 582);
                     if(§§pop())
                     {
                        set("\x01",eval("\x01") + 745);
                     }
                  }
                  else if(eval("\x01") == 688)
                  {
                     set("\x01",eval("\x01") - 510);
                     §§push(!§§pop());
                  }
                  else
                  {
                     if(eval("\x01") != 157)
                     {
                        break;
                     }
                     set("\x01",eval("\x01") + 115);
                     if(§§pop())
                     {
                        set("\x01",eval("\x01") - 142);
                     }
                  }
               }
               continue;
            }
            set("\x01",eval("\x01") + 745);
            nextFrame();
            toggleHighQuality();
            _loc3_[§§constant(34)](mx.events.UIEventDispatcher = function()
            {
               super();
            }[§§constant(32)],§§pop()[§§pop() add §§pop()],§§pop());
            §§pop()[§§pop()] = §§pop();
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(35)] = function(Void)
            {
               this[§§constant(36)](this[§§constant(18)]());
               this[§§constant(37)](this[§§constant(32)],this[§§constant(33)]);
               var _loc3_ = 0;
               var _loc4_;
               while(_loc3_ < 8)
               {
                  _loc4_ = this[§§constant(28)][_loc3_];
                  if(typeof this[_loc4_] == §§constant(38))
                  {
                     this[_loc4_][§§constant(34)](this[§§constant(32)],this[§§constant(33)],true);
                  }
                  _loc3_ = _loc3_ + 1;
               }
               super[§§constant(35)]();
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(39)] = function(val)
            {
               this[§§constant(40)] = val;
               this[§§constant(41)]();
               return this[§§constant(42)]();
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(42)] = function()
            {
               return this[§§constant(40)];
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(43)] = function(Void)
            {
               return this[§§constant(40)];
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(44)] = function(val)
            {
               this[§§constant(40)] = val;
               this[§§constant(41)]();
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(45)] = function(Void)
            {
               var _loc2_;
               if(this[§§constant(18)]())
               {
                  _loc2_ = this[§§constant(46)];
               }
               else if(this[§§constant(23)] == §§constant(47))
               {
                  _loc2_ = this[§§constant(46)];
               }
               else
               {
                  _loc2_ = 0;
               }
               return _loc2_;
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(48)] = function(offset)
            {
               var _loc16_ = !offset ? 0 : this[§§constant(46)];
               var _loc12_ = this[§§constant(43)]();
               var _loc7_ = 0;
               var _loc6_ = 0;
               var _loc9_ = 0;
               var _loc8_ = 0;
               var _loc5_ = 0;
               var _loc4_ = 0;
               var _loc3_ = this[§§constant(10)];
               var _loc2_ = this[§§constant(49)];
               var _loc15_ = _loc3_[§§constant(50)];
               var _loc14_ = _loc3_[§§constant(51)];
               var _loc10_ = this[§§constant(32)] - this[§§constant(52)] - this[§§constant(52)];
               var _loc11_ = this[§§constant(33)] - this[§§constant(52)] - this[§§constant(52)];
               if(_loc2_ != undefined)
               {
                  _loc7_ = _loc2_[§§constant(53)];
                  _loc6_ = _loc2_[§§constant(54)];
               }
               if(_loc12_ == §§constant(55) || _loc12_ == §§constant(56))
               {
                  if(_loc3_ != undefined)
                  {
                     _loc3_[§§constant(53)] = _loc9_ = eval(§§constant(57))[§§constant(58)](_loc10_ - _loc7_,_loc15_ + 5);
                     _loc3_[§§constant(54)] = _loc8_ = eval(§§constant(57))[§§constant(58)](_loc11_,_loc14_ + 5);
                  }
                  if(_loc12_ == §§constant(56))
                  {
                     _loc5_ = _loc7_;
                     if(this[§§constant(59)])
                     {
                        _loc5_ += (_loc10_ - _loc9_ - _loc7_) / 2;
                     }
                     _loc2_[§§constant(60)] = _loc5_ - _loc7_;
                  }
                  else
                  {
                     _loc5_ = _loc10_ - _loc9_ - _loc7_;
                     if(this[§§constant(59)])
                     {
                        _loc5_ /= 2;
                     }
                     _loc2_[§§constant(60)] = _loc5_ + _loc9_;
                  }
                  _loc2_[§§constant(61)] = _loc4_ = 0;
                  if(this[§§constant(59)])
                  {
                     _loc2_[§§constant(61)] = (_loc11_ - _loc6_) / 2;
                     _loc4_ = (_loc11_ - _loc8_) / 2;
                  }
                  if(!this[§§constant(59)])
                  {
                     _loc2_[§§constant(61)] += eval(§§constant(57))[§§constant(62)](0,(_loc8_ - _loc6_) / 2);
                  }
               }
               else
               {
                  if(_loc3_ != undefined)
                  {
                     _loc3_[§§constant(53)] = _loc9_ = eval(§§constant(57))[§§constant(58)](_loc10_,_loc15_ + 5);
                     _loc3_[§§constant(54)] = _loc8_ = eval(§§constant(57))[§§constant(58)](_loc11_ - _loc6_,_loc14_ + 5);
                  }
                  _loc5_ = (_loc10_ - _loc9_) / 2;
                  _loc2_[§§constant(60)] = (_loc10_ - _loc7_) / 2;
                  if(_loc12_ == §§constant(63))
                  {
                     _loc4_ = _loc11_ - _loc8_ - _loc6_;
                     if(this[§§constant(59)])
                     {
                        _loc4_ /= 2;
                     }
                     _loc2_[§§constant(61)] = _loc4_ + _loc8_;
                  }
                  else
                  {
                     _loc4_ = _loc6_;
                     if(this[§§constant(59)])
                     {
                        _loc4_ += (_loc11_ - _loc8_ - _loc6_) / 2;
                     }
                     _loc2_[§§constant(61)] = _loc4_ - _loc6_;
                  }
               }
               var _loc13_ = this[§§constant(52)] + _loc16_;
               _loc3_[§§constant(60)] = _loc5_ + _loc13_;
               _loc3_[§§constant(61)] = _loc4_ + _loc13_;
               _loc2_[§§constant(60)] += _loc13_;
               _loc2_[§§constant(61)] += _loc13_;
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(64)] = function(lbl)
            {
               this[§§constant(65)](lbl);
               return this[§§constant(66)]();
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(65)] = function(label)
            {
               if(label == §§constant(67))
               {
                  this[§§constant(10)][§§constant(68)]();
                  this[§§constant(69)]();
                  return undefined;
               }
               var _loc2_;
               if(this[§§constant(10)] == undefined)
               {
                  _loc2_ = this[§§constant(70)](§§constant(10),200,label);
                  _loc2_[§§constant(53)] = _loc2_[§§constant(50)] + 5;
                  _loc2_[§§constant(54)] = _loc2_[§§constant(51)] + 5;
                  if(this[§§constant(9)])
                  {
                     _loc2_[§§constant(11)] = false;
                  }
               }
               else
               {
                  delete this[§§constant(10)][§§constant(71)];
                  this[§§constant(10)][§§constant(72)] = label;
                  this[§§constant(69)]();
               }
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(73)] = function(Void)
            {
               return this[§§constant(10)][§§constant(71)] == undefined ? this[§§constant(10)][§§constant(72)] : this[§§constant(10)][§§constant(71)];
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(66)] = function()
            {
               return this[§§constant(73)]();
            };
            mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(74)] = function(Void)
            {
               return this[§§constant(75)];
            };
         }
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(76)] = function()
         {
            if(this.owner)
            {
               return this.onKeyUp;
            }
            return this[§§constant(75)];
         };
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().Key = function(linkage)
         {
            if(this.owner)
            {
               if(linkage == §§constant(67))
               {
                  return undefined;
               }
               this.onKeyUp = linkage;
            }
            else
            {
               if(linkage == §§constant(67))
               {
                  this[§§constant(77)]();
                  return undefined;
               }
               super[§§constant(78)](0,linkage);
               super[§§constant(78)](1,linkage);
               super[§§constant(78)](3,linkage);
               super[§§constant(78)](4,linkage);
               super[§§constant(78)](5,linkage);
               this[§§constant(75)] = linkage;
               this[§§constant(69)]();
            }
         };
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(79)] = function(linkage)
         {
            this.Key(linkage);
            return this[§§constant(76)]();
         };
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().ascii = function(w, h)
         {
            if(this[§§constant(80)] == undefined)
            {
               this[§§constant(81)](§§constant(80),100);
            }
            var _loc2_ = this[§§constant(80)];
            _loc2_[§§constant(82)]();
            _loc2_[§§constant(83)](16711680);
            _loc2_[§§constant(84)](0,0,w,h);
            _loc2_[§§constant(85)]();
            _loc2_[§§constant(86)](false);
         };
         mx.events.UIEventDispatcher = function()
         {
            super();
         }[§§constant(87)] = "UIEventDispatcher";
         mx.events.UIEventDispatcher = function()
         {
            super();
         }[§§constant(88)] = mx.events.UIEventDispatcher;
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(89)] = "UIEventDispatcher";
         mx.events.UIEventDispatcher = function()
         {
            super();
         }[§§constant(90)] = §§constant(91);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().lowLevelEvents = 0;
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(92)] = §§constant(93);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(94)] = §§constant(95);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().isDown = §§constant(56);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(96)] = §§constant(97);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(98)] = §§constant(97);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(99)] = §§constant(97);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(100)] = §§constant(97);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(101)] = §§constant(97);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(102)] = §§constant(97);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(103)] = §§constant(97);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(104)] = §§constant(97);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(105)] = §§constant(67);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(106)] = §§constant(67);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(107)] = §§constant(67);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(108)] = §§constant(67);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(109)] = §§constant(67);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(110)] = §§constant(67);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(111)] = §§constant(67);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(112)] = §§constant(67);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(113)] = {(§§constant(114)):1,(§§constant(115)):1,(§§constant(116)):1,(§§constant(117)):1,(§§constant(118)):1};
         mx.events.UIEventDispatcher = function()
         {
            super();
         }[§§constant(119)] = mx[§§constant(120)][§§constant(121)][§§constant(122)](mx.events.UIEventDispatcher.prototype[§§constant(113)],mx.events.EventDispatcher.prototype[§§constant(113)]);
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(59)] = true;
         mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().ASSetPropFlags = 1;
         §§push((mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher())[§§constant(123)](§§constant(115),mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(76)],mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(79)]));
         §§push((mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher())[§§constant(123)](§§constant(118),mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(66)],mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher()[§§constant(64)]));
         §§push((mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher())[§§constant(123)](§§constant(114),mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().keyUp,mx.events.UIEventDispatcher.prototype = new mx.events.EventDispatcher().shiftKey));
         §§constant(124)(mx.events.UIEventDispatcher.prototype,null,1);
         break;
      }
      set("\x01",eval("\x01") - 163);
      §§push(true);
   }
}
