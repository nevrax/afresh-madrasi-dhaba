function §\x01\x02§()
{
   return 39 % 511 * 5;
}
var §\x01§ = 743 + "\x01\x02"();
var _loc2_;
var _loc5_;
while(true)
{
   if(eval("\x01") == 938)
   {
      set("\x01",eval("\x01") - 393);
      §§push(true);
   }
   else
   {
      if(eval("\x01") == 177)
      {
         set("\x01",eval("\x01") + 190);
         if(!_global.mx)
         {
            _global.mx = new Object();
         }
         §§pop();
         if(!_global.mx.managers)
         {
            _global.mx.managers = new Object();
         }
         §§pop();
         if(!_global.mx.managers.OverlappedWindows)
         {
            _loc2_ = mx.managers.OverlappedWindows = function()
            {
            }.prototype;
            mx.managers.OverlappedWindows = function()
            {
            }.checkIdle = function(Void)
            {
               if(mx.managers.SystemManager.idleFrames > 10)
               {
                  mx.managers.SystemManager.dispatchEvent({type:"idle"});
               }
               else
               {
                  mx.managers.SystemManager.idleFrames++;
               }
            };
            mx.managers.OverlappedWindows = function()
            {
            }.__addEventListener = function(e, o, l)
            {
               if(e == "idle")
               {
                  if(mx.managers.SystemManager.interval == undefined)
                  {
                     mx.managers.SystemManager.interval = setInterval(mx.managers.SystemManager.checkIdle,100);
                  }
               }
               mx.managers.SystemManager._xAddEventListener(e,o,l);
            };
            mx.managers.OverlappedWindows = function()
            {
            }.__removeEventListener = function(e, o, l)
            {
               if(e == "idle")
               {
                  if(mx.managers.SystemManager._xRemoveEventListener(e,o,l) == 0)
                  {
                     clearInterval(mx.managers.SystemManager.interval);
                  }
               }
               else
               {
                  mx.managers.SystemManager._xRemoveEventListener(e,o,l);
               }
            };
            mx.managers.OverlappedWindows = function()
            {
            }.onMouseDown = function(Void)
            {
               mx.managers.SystemManager.idleFrames = 0;
               mx.managers.SystemManager.isMouseDown = true;
               var _loc5_ = _root;
               var _loc3_;
               var _loc8_ = _root._xmouse;
               var _loc7_ = _root._ymouse;
               var _loc6_;
               var _loc4_;
               var _loc2_;
               if(mx.managers.SystemManager.form.modalWindow == undefined)
               {
                  if(mx.managers.SystemManager.forms.length > 1)
                  {
                     _loc6_ = mx.managers.SystemManager.forms.length;
                     _loc4_ = 0;
                     while(_loc4_ < _loc6_)
                     {
                        _loc2_ = mx.managers.SystemManager.forms[_loc4_];
                        if(_loc2_._visible)
                        {
                           if(_loc2_.hitTest(_loc8_,_loc7_))
                           {
                              if(_loc3_ == undefined)
                              {
                                 _loc3_ = _loc2_.getDepth();
                                 _loc5_ = _loc2_;
                              }
                              else if(_loc3_ < _loc2_.getDepth())
                              {
                                 _loc3_ = _loc2_.getDepth();
                                 _loc5_ = _loc2_;
                              }
                           }
                        }
                        _loc4_ = _loc4_ + 1;
                     }
                     if(_loc5_ != mx.managers.SystemManager.form)
                     {
                        mx.managers.SystemManager.activate(_loc5_);
                     }
                  }
               }
               var _loc9_ = mx.managers.SystemManager.form;
               _loc9_.focusManager._onMouseDown();
            };
            mx.managers.OverlappedWindows = function()
            {
            }.onMouseMove = function(Void)
            {
               mx.managers.SystemManager.idleFrames = 0;
            };
            mx.managers.OverlappedWindows = function()
            {
            }.onMouseUp = function(Void)
            {
               mx.managers.SystemManager.isMouseDown = false;
               mx.managers.SystemManager.idleFrames = 0;
            };
            mx.managers.OverlappedWindows = function()
            {
            }.activate = function(f)
            {
               var _loc1_;
               if(mx.managers.SystemManager.form != undefined)
               {
                  if(mx.managers.SystemManager.form != f && mx.managers.SystemManager.forms.length > 1)
                  {
                     _loc1_ = mx.managers.SystemManager.form;
                     _loc1_.focusManager.deactivate();
                  }
               }
               mx.managers.SystemManager.form = f;
               f.focusManager.activate();
            };
            mx.managers.OverlappedWindows = function()
            {
            }.deactivate = function(f)
            {
               var _loc5_;
               var _loc3_;
               var _loc1_;
               var _loc2_;
               if(mx.managers.SystemManager.form != undefined)
               {
                  if(mx.managers.SystemManager.form == f && mx.managers.SystemManager.forms.length > 1)
                  {
                     _loc5_ = mx.managers.SystemManager.form;
                     _loc5_.focusManager.deactivate();
                     _loc3_ = mx.managers.SystemManager.forms.length;
                     _loc1_ = 0;
                     while(_loc1_ < _loc3_)
                     {
                        if(mx.managers.SystemManager.forms[_loc1_] == f)
                        {
                           _loc1_ += 1;
                           while(_loc1_ < _loc3_)
                           {
                              if(mx.managers.SystemManager.forms[_loc1_]._visible == true)
                              {
                                 _loc2_ = mx.managers.SystemManager.forms[_loc1_];
                              }
                              _loc1_ = _loc1_ + 1;
                           }
                           mx.managers.SystemManager.form = _loc2_;
                           break;
                        }
                        if(mx.managers.SystemManager.forms[_loc1_]._visible == true)
                        {
                           _loc2_ = mx.managers.SystemManager.forms[_loc1_];
                        }
                        _loc1_ = _loc1_ + 1;
                     }
                     _loc5_ = mx.managers.SystemManager.form;
                     _loc5_.focusManager.activate();
                  }
               }
            };
            mx.managers.OverlappedWindows = function()
            {
            }.addFocusManager = function(f)
            {
               mx.managers.SystemManager.forms.push(f);
               mx.managers.SystemManager.activate(f);
            };
            mx.managers.OverlappedWindows = function()
            {
            }.removeFocusManager = function(f)
            {
               var _loc3_ = mx.managers.SystemManager.forms.length;
               var _loc1_;
               _loc1_ = 0;
               while(_loc1_ < _loc3_)
               {
                  if(mx.managers.SystemManager.forms[_loc1_] == f)
                  {
                     if(mx.managers.SystemManager.form == f)
                     {
                        mx.managers.SystemManager.deactivate(f);
                     }
                     mx.managers.SystemManager.forms.splice(_loc1_,1);
                     return undefined;
                  }
                  _loc1_ = _loc1_ + 1;
               }
            };
            mx.managers.OverlappedWindows = function()
            {
            }.enableOverlappedWindows = function()
            {
               if(!mx.managers.OverlappedWindows.initialized)
               {
                  mx.managers.OverlappedWindows.initialized = true;
                  mx.managers.SystemManager.checkIdle = mx.managers.OverlappedWindows.checkIdle;
                  mx.managers.SystemManager.__addEventListener = mx.managers.OverlappedWindows.__addEventListener;
                  mx.managers.SystemManager.__removeEventListener = mx.managers.OverlappedWindows.__removeEventListener;
                  mx.managers.SystemManager.onMouseDown = mx.managers.OverlappedWindows.onMouseDown;
                  mx.managers.SystemManager.onMouseMove = mx.managers.OverlappedWindows.onMouseMove;
                  mx.managers.SystemManager.onMouseUp = mx.managers.OverlappedWindows.onMouseUp;
                  mx.managers.SystemManager.activate = mx.managers.OverlappedWindows.activate;
                  mx.managers.SystemManager.deactivate = mx.managers.OverlappedWindows.deactivate;
                  mx.managers.SystemManager.addFocusManager = mx.managers.OverlappedWindows.addFocusManager;
                  mx.managers.SystemManager.removeFocusManager = mx.managers.OverlappedWindows.removeFocusManager;
               }
            };
            mx.managers.OverlappedWindows = function()
            {
            }.initialized = false;
            mx.managers.OverlappedWindows = function()
            {
            }.SystemManagerDependency = mx.managers.SystemManager;
            §§push(ASSetPropFlags(mx.managers.OverlappedWindows.prototype,null,1));
         }
         §§pop();
         break;
      }
      if(eval("\x01") == 545)
      {
         set("\x01",eval("\x01") + 397);
         if(§§pop())
         {
            set("\x01",eval("\x01") - 941);
         }
      }
      else if(eval("\x01") == 63)
      {
         set("\x01",eval("\x01") + 114);
      }
      else
      {
         if(eval("\x01") == 942)
         {
            set("\x01",eval("\x01") - 941);
            var §§pop() = §§pop()[§§pop()];
            break;
         }
         if(eval("\x01") == 831)
         {
            set("\x01",eval("\x01") - 724);
            §§pop();
            (mx.managers.OverlappedWindows = function()
            {
            })[§§constant(104)](_loc6_,_loc5_._xAddEventListener != undefined ? _loc5_._xAddEventListener : 0,_loc5_[§§constant(87)],_loc3_,true);
            _loc2_;
            if(_loc3_)
            {
               if(mx.managers.OverlappedWindows = function()
               {
               }[§§constant(99)] != undefined)
               {
                  _loc2_ = mx.managers.OverlappedWindows = function()
                  {
                  }[§§constant(99)];
               }
               else
               {
                  _loc2_ = mx.managers.OverlappedWindows = function()
                  {
                  }[§§constant(100)];
               }
            }
            else if(mx.managers.OverlappedWindows = function()
            {
            }[§§constant(98)] != undefined)
            {
               _loc2_ = mx.managers.OverlappedWindows = function()
               {
               }[§§constant(98)];
            }
            else
            {
               _loc2_ = mx.managers.OverlappedWindows = function()
               {
               }[§§constant(101)];
            }
            if(_loc2_._xAddEventListener != _loc5_._xAddEventListener)
            {
               mx.managers.OverlappedWindows = function()
               {
               }[§§constant(96)] = new Object();
               mx.managers.OverlappedWindows = function()
               {
               }[§§constant(96)]._xAddEventListener = _loc2_._xAddEventListener;
               mx.managers.OverlappedWindows = function()
               {
               }[§§constant(96)][_loc2_[§§constant(97)]] = _loc2_;
            }
            else
            {
               if(mx.managers.OverlappedWindows = function()
               {
               }[§§constant(96)] == undefined)
               {
                  mx.managers.OverlappedWindows = function()
                  {
                  }[§§constant(96)] = new Object();
                  mx.managers.OverlappedWindows = function()
                  {
                  }[§§constant(96)]._xAddEventListener = _loc2_._xAddEventListener;
               }
               mx.managers.OverlappedWindows = function()
               {
               }[§§constant(96)][_loc2_[§§constant(97)]] = _loc2_;
            }
            if(_loc2_ == undefined)
            {
               if(_loc3_ == false)
               {
                  if(mx.managers.OverlappedWindows = function()
                  {
                  }[§§constant(92)] != undefined)
                  {
                     _loc2_ = mx.managers.OverlappedWindows = function()
                     {
                     }[§§constant(92)];
                  }
                  else
                  {
                     _loc2_ = mx.managers.OverlappedWindows = function()
                     {
                     }[§§constant(89)];
                  }
               }
               else if(mx.managers.OverlappedWindows = function()
               {
               }[§§constant(94)] == undefined || _loc5_ == mx.managers.OverlappedWindows = function()
               {
               }.clearInterval)
               {
                  _loc2_ = mx.managers.OverlappedWindows = function()
                  {
                  }[§§constant(103)];
               }
               else
               {
                  _loc2_ = mx.managers.OverlappedWindows = function()
                  {
                  }[§§constant(94)];
               }
            }
            if(_loc2_ == undefined)
            {
               return undefined;
            }
            mx.managers.OverlappedWindows = function()
            {
            }[§§constant(109)] = _loc2_;
            (mx.managers.OverlappedWindows = function()
            {
            })[§§constant(67)](_loc2_);
            if(_loc2_[§§constant(110)] != undefined)
            {
               if(mx.managers.OverlappedWindows = function()
               {
               }.__addEventListener != undefined)
               {
                  _loc5_ = mx.managers.OverlappedWindows = function()
                  {
                  }.__addEventListener;
                  mx.managers.OverlappedWindows = function()
                  {
                  }.__addEventListener = _loc2_;
                  _loc5_[§§constant(110)] = false;
                  _loc2_[§§constant(110)] = true;
               }
            }
            else if(mx.managers.OverlappedWindows = function()
            {
            }.__addEventListener != undefined && mx.managers.OverlappedWindows = function()
            {
            }.__addEventListener != mx.managers.OverlappedWindows = function()
            {
            }.type)
            {
               _loc5_ = mx.managers.OverlappedWindows = function()
               {
               }.__addEventListener;
               mx.managers.OverlappedWindows = function()
               {
               }.__addEventListener = mx.managers.OverlappedWindows = function()
               {
               }.type;
               _loc5_[§§constant(110)] = false;
               mx.managers.OverlappedWindows = function()
               {
               }.type.dispatchEvent(true);
            }
            §§pop()[§§pop()] = §§pop();
            _loc2_[§§constant(111)] = function(Void)
            {
               mx.managers._xmouse[§§constant(112)] = 0;
               if(this[§§constant(113)])
               {
                  if(eval(§§constant(48))[§§constant(114)]() == 13)
                  {
                     if(this.idleFrames() != undefined)
                     {
                        this[§§constant(54)](this,§§constant(115));
                     }
                  }
               }
            };
            _loc2_[§§constant(115)] = function(Void)
            {
               this.__addEventListener[§§constant(118)]({(§§constant(116)):§§constant(117)});
            };
            _loc2_[§§constant(119)] = function(x, y, o)
            {
               var _loc2_;
               var _loc3_;
               for(var _loc7_ in o)
               {
                  _loc2_ = o[_loc7_];
                  if(_loc2_[§§constant(46)] && _loc2_.enableOverlappedWindows && _loc2_.setInterval == o && _loc2_[§§constant(85)] != this[§§constant(85)])
                  {
                     _loc2_[§§constant(85)] = this[§§constant(85)];
                     if(_loc2_[§§constant(120)](x,y,true))
                     {
                        if(_loc2_[§§constant(77)] != undefined || _loc2_[§§constant(78)] != undefined)
                        {
                           return _loc2_;
                        }
                        _loc3_ = this[§§constant(119)](x,y,_loc2_);
                        if(_loc3_ != undefined)
                        {
                           return _loc3_;
                        }
                        return _loc2_;
                     }
                  }
               }
               return undefined;
            };
            _loc2_[§§constant(121)] = function(Void)
            {
               if(!this[§§constant(51)])
               {
                  return undefined;
               }
               this[§§constant(85)] = getTimer();
               var _loc2_ = this[§§constant(119)](this[§§constant(44)].modalWindow,this[§§constant(44)].form,this.clearInterval);
               if(_loc2_ instanceof mx.checkIdle.SystemManager)
               {
                  return undefined;
               }
               _loc2_ = this[§§constant(122)](_loc2_);
               if(_loc2_ == this[§§constant(50)])
               {
                  return undefined;
               }
               if(_loc2_ == undefined)
               {
                  this[§§constant(54)](this,§§constant(53));
                  return undefined;
               }
               var _loc3_ = _loc2_[§§constant(64)];
               var _loc6_;
               var _loc5_;
               if(_loc3_ != undefined)
               {
                  _loc6_ = _loc2_[§§constant(65)];
                  _loc5_ = _loc2_[§§constant(66)];
               }
               this[§§constant(67)](_loc2_);
               var _loc4_ = SystemManagerDependency;
               SystemManagerDependency[§§constant(70)](_loc4_[§§constant(69)],_loc4_[§§constant(68)]);
               if(_loc3_ != undefined)
               {
                  _loc2_[§§constant(65)] = _loc6_;
                  _loc2_[§§constant(64)] = _loc3_;
                  _loc2_[§§constant(66)] = _loc5_;
               }
            };
            _loc2_[§§constant(123)] = function(Void)
            {
               this[§§constant(107)] = false;
               if(this[§§constant(50)] != undefined)
               {
                  this[§§constant(50)][§§constant(124)](false);
               }
               mx.managers._xmouse[§§constant(112)] = 0;
               var _loc3_ = SystemManagerDependency;
               _loc3_[§§constant(69)] = SystemManagerDependency[§§constant(125)]();
               _loc3_[§§constant(68)] = SystemManagerDependency[§§constant(126)]();
               this[§§constant(44)].modalWindow = _root[§§constant(127)];
               this[§§constant(44)].form = _root[§§constant(128)];
               _root[§§constant(129)](this[§§constant(44)]);
            };
            _loc2_[§§constant(130)] = function(Void)
            {
               if(this[§§constant(46)])
               {
                  this[§§constant(54)](this,§§constant(121));
               }
            };
            _loc2_[§§constant(131)] = function(e)
            {
               if(e[§§constant(116)] == "addFocusManager")
               {
                  mx.managers._xmouse[§§constant(47)](this.clearInterval);
               }
               else
               {
                  mx.managers._xmouse[§§constant(55)](this.clearInterval);
               }
            };
            mx.managers.OverlappedWindows = function()
            {
            }[§§constant(132)] = function()
            {
               if(!mx.managers.OverlappedWindows[§§constant(133)])
               {
                  mx.managers.OverlappedWindows[§§constant(133)] = true;
                  Object[§§constant(134)]("OverlappedWindows",mx.managers.OverlappedWindows);
                  if(_root.onMouseMove == undefined)
                  {
                     _root[§§constant(137)](mx.managers.OverlappedWindows,"onMouseMove",mx.managers[§§constant(135)][§§constant(136)]--);
                  }
               }
            };
            mx.managers.OverlappedWindows = function()
            {
            }[§§constant(138)] = "OverlappedWindows";
            mx.managers.OverlappedWindows = function()
            {
            }[§§constant(139)] = mx.managers.OverlappedWindows;
            mx.managers.OverlappedWindows = function()
            {
            }[§§constant(140)] = §§constant(141);
            _loc2_[§§constant(142)] = "OverlappedWindows";
            _loc2_[§§constant(51)] = false;
            _loc2_[§§constant(107)] = false;
            _loc2_[§§constant(113)] = true;
            _loc2_[§§constant(49)] = true;
            mx.managers.OverlappedWindows = function()
            {
            }[§§constant(133)] = false;
            mx.managers.OverlappedWindows = function()
            {
            }[§§constant(143)] = mx.checkIdle[§§constant(144)][§§constant(145)];
            §§push(_loc2_[§§constant(147)](§§constant(146),_loc2_.idleFrames,_loc2_.idle));
            §§push(_loc2_[§§constant(147)](§§constant(148),_loc2_.onMouseDown,function()
            {
            }
            ));
            §§constant(45)(mx.managers.OverlappedWindows.prototype,null,1);
            break;
         }
         if(eval("\x01") == 121)
         {
            set("\x01",eval("\x01") + 710);
            if(§§pop())
            {
               set("\x01",eval("\x01") - 724);
            }
         }
         else if(eval("\x01") == 107)
         {
            set("\x01",eval("\x01") + 288);
         }
         else if(eval("\x01") == 1)
         {
            set("\x01",eval("\x01") + 342);
         }
         else if(eval("\x01") == 702)
         {
            set("\x01",eval("\x01") - 444);
            §§push(eval(§§pop()));
         }
         else if(eval("\x01") == 290)
         {
            set("\x01",eval("\x01") + 412);
            §§push("\x0f");
         }
         else if(eval("\x01") == 278)
         {
            set("\x01",eval("\x01") - 111);
         }
         else if(eval("\x01") == 446)
         {
            set("\x01",eval("\x01") - 156);
            var §§pop() = §§pop();
         }
         else if(eval("\x01") == 395)
         {
            set("\x01",eval("\x01") + 51);
            §§push("\x0f");
            §§push(1);
         }
         else if(eval("\x01") == 114)
         {
            set("\x01",eval("\x01") + 229);
         }
         else if(eval("\x01") == 343)
         {
            set("\x01",eval("\x01") + 503);
            §§push(true);
         }
         else if(eval("\x01") == 167)
         {
            set("\x01",eval("\x01") + 90);
            §§push(true);
         }
         else if(eval("\x01") == 865)
         {
            set("\x01",eval("\x01") - 470);
         }
         else if(eval("\x01") == 258)
         {
            set("\x01",eval("\x01") + 108);
            §§push(!§§pop());
         }
         else if(eval("\x01") == 366)
         {
            set("\x01",eval("\x01") - 303);
            if(§§pop())
            {
               set("\x01",eval("\x01") + 114);
            }
         }
         else if(eval("\x01") == 846)
         {
            set("\x01",eval("\x01") - 166);
            if(§§pop())
            {
               set("\x01",eval("\x01") - 402);
            }
         }
         else if(eval("\x01") == 108)
         {
            set("\x01",eval("\x01") + 13);
            §§push(true);
         }
         else if(eval("\x01") == 490)
         {
            set("\x01",eval("\x01") - 382);
         }
         else
         {
            if(eval("\x01") == 367)
            {
               set("\x01",eval("\x01") - 367);
               break;
            }
            if(eval("\x01") == 460)
            {
               set("\x01",eval("\x01") - 352);
            }
            else
            {
               if(eval("\x01") == 680)
               {
                  set("\x01",eval("\x01") - 402);
                  §§push(§§pop() << §§pop());
                  break;
               }
               if(eval("\x01") == 925)
               {
                  set("\x01",eval("\x01") - 758);
               }
               else
               {
                  if(eval("\x01") == 663)
                  {
                     set("\x01",eval("\x01") - 203);
                     break;
                  }
                  if(eval("\x01") != 257)
                  {
                     break;
                  }
                  set("\x01",eval("\x01") + 406);
                  if(§§pop())
                  {
                     set("\x01",eval("\x01") - 203);
                  }
               }
            }
         }
      }
   }
}
