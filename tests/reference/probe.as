// A new root-frame3 action tag; no original code/resource is replaced.
// Flashvars probeCase: observe, timers, timing, template, orphan-controls,
// orphan-removed, patience, cook, day-boundary, day, tutorial, matched-day. Overrides are traced.
var __mdProbeStarted=getTimer();
var __mdProbeLast="";
var __mdProbeGameStarted=-1;
var __mdProbeStep=0;
var __mdProbeFrames=0;
var __mdProbeFoodFlipped=false;
var __mdProbeFoodHeld=-1;
var __mdProbePlatedAt=-1;
var __mdProbeCompleted=false;
var __mdProbeNextCustomer=0;
var __mdProbeOrderControlled=false;
var __mdProbeEndStarted=-1;
var __mdProbeOldCustomer;
var __mdProbeFunctionTicks=0;
var __mdProbeMethodTicks=0;
var __mdProbeTutorialPrevious=0;
var __mdProbeTutorialLoops=0;
var __mdProbeMatchedStarted=-1;
var __mdProbeMatchedActions=[];
var __mdProbeMatchedIndex=0;
var __mdProbeMatchedServes=0;
var __mdProbeMatchedTomorrowAt=-1;
function __mdProbeLog(message) { trace("probe|"+probeCase+"|"+(getTimer()-__mdProbeStarted)+"|"+message); }
function __mdProbeState() {
  var state="frame="+_root._currentframe+",day="+_root.currentLevel+",cash="+_root.cashCollected.text+",total="+_root.totalScore+",clock="+_root.clockTime+",lost="+_root.txtCustomersLost.text+",lostSingular="+_root.txtCustomerLost.text+",plate="+_root.dosaCount+",mouse="+_root.mouseState;
  if(probeCase=="template" || probeCase=="timing") state+=",template="+_root.mcDosa._currentframe+",Stop="+typeof(_root.mcDosa.Stop)+",stop="+typeof(_root.mcDosa.stop);
  if(probeCase=="tutorial" && _root.mcInstruction!=undefined) {
    var instruction=_root.mcInstruction;
    state+=",tutorial="+instruction._currentframe+"/"+instruction._totalframes+",visible="+instruction._visible+",CheckComplete="+typeof(instruction.CheckComplete);
    var animatedDepths=[21,32,34,36,38,40,42,44,69,77,100,133,140,144,155,164];
    for(var ai=0;ai<animatedDepths.length;ai++) {
      var child=instruction.getInstanceAtDepth(animatedDepths[ai]-16384);
      if(child!=undefined && child._totalframes>1) state+=";tutorialDepth"+animatedDepths[ai]+"="+child._currentframe+"/"+child._totalframes;
    }
    state+=";radioChildren="+instruction.mcRadio.mcSound1._currentframe+","+instruction.mcRadio.mcSound2._currentframe;
    var tutorialDosa=instruction.getInstanceAtDepth(155-16384);
    state+=";tutorialDosaChildren="+tutorialDosa.thavi._currentframe+","+tutorialDosa.mcShadow._currentframe;
  }
  for(var ci=0;ci<5;ci++) {
    var c=_root["customer"+ci];
    if(c!=undefined && c._visible) state+=";c"+ci+"="+c.tableNumber+",order:"+c.mcOrder._visible+","+c.mcOrder.orderCount+",pose:"+c.character._currentframe+",eat:"+c.eat_action_count+",exit:"+c.mcExit._currentframe+",patience:"+c.mcOrder.patienceMeter.patienceMasker._y;
  }
  for(var fi=0;fi<18;fi++) if(_root["dosa"+fi]!=undefined) {
    var d=_root["dosa"+fi]; state+=";d"+fi+"="+d._currentframe+",spoon:"+d.thavi._currentframe+",shadow:"+d.mcShadow._currentframe+",smoke:"+d.getInstanceAtDepth(9-16384)._currentframe;
  }
  for(var pi=0;pi<_root.dosaCount;pi++) {var p=_root["dosaOnPlate"+pi];state+=";plate"+pi+"="+p._currentframe+",smoke:"+p.getInstanceAtDepth(9-16384)._currentframe;}
  if(probeCase=="orphan-removed" && __mdProbeOldCustomer!=undefined) state+=";old="+__mdProbeOldCustomer._name+",parent:"+__mdProbeOldCustomer._parent+",patience:"+__mdProbeOldCustomer.mcOrder.patienceMeter.patienceMasker._y+",orderTimer:"+__mdProbeOldCustomer.orderTimer+",patienceTimer:"+__mdProbeOldCustomer.patienceTimer;
  return state;
}
function __mdProbePoll() { var state=__mdProbeState(); if(state!=__mdProbeLast) {__mdProbeLog(state);__mdProbeLast=state;} }
function __mdProbeStop(reason) {
  if(__mdProbeCompleted) return;
  __mdProbePoll();__mdProbeLog("DONE:"+reason);__mdProbeCompleted=true;
  clearInterval(__mdProbePollTimer);delete _root.__mdProbeObserver.onEnterFrame;
}
function __mdProbePlace() {
  if(_root.dosa0==undefined && _root.mouseState==_root.STATE_BLANK) {
    _root.mcMavu.onRelease();_root.dosaHolder0.onRelease();__mdProbeFoodFlipped=false;__mdProbeFoodHeld=-1;__mdProbePlatedAt=-1;
    __mdProbeLog("ACTION:source batter and slot0 releases");
  }
}
function __mdProbeCustomer() {
  _root.customer0.Appear(0);__mdProbeOrderControlled=false;
  __mdProbeLog("OVERRIDE:source customer0.Appear(table0), scheduled random arrival disabled");
}
function __mdProbeCook() {
  var d=_root.dosa0;
  if(d!=undefined) {
    if(!__mdProbeFoodFlipped && d._currentframe>70 && d._currentframe<160) {
      _root.dosaHolder0.onRelease();__mdProbeFoodFlipped=true;__mdProbeLog("ACTION:source flip,pose="+d._currentframe);
    } else if(__mdProbeFoodFlipped && __mdProbeFoodHeld<0 && d._currentframe>326 && d._currentframe<430) {
      _root.dosaHolder0.onRelease();__mdProbeFoodHeld=getTimer();
      __mdProbeLog("ACTION:source pickup,pose="+d._currentframe+",spoon="+d.thavi._currentframe+",shadow="+d.mcShadow._currentframe+",smoke="+d.getInstanceAtDepth(9-16384)._currentframe);
    } else if(__mdProbeFoodHeld>=0 && getTimer()-__mdProbeFoodHeld>=1000 && _root.mouseState==_root.STATE_HOLDINGDOSA) {
      __mdProbeLog("HELD:1000ms,pose="+d._currentframe+",spoon="+d.thavi._currentframe+",shadow="+d.mcShadow._currentframe+",smoke="+d.getInstanceAtDepth(9-16384)._currentframe);
      _root.mcPlate.onRelease();__mdProbePlatedAt=getTimer();__mdProbeLog("ACTION:source add to plate,count="+_root.dosaCount+",smoke="+_root.dosaOnPlate0.getInstanceAtDepth(9-16384)._currentframe);
      if(probeCase=="cook") __mdProbeLog("OVERRIDE:wait750ms before serving to observe plated smoke");
    }
  }
  if(_root.customer0.mcOrder._visible && !__mdProbeOrderControlled) {
    __mdProbeLog("OVERRIDE:order quantity "+_root.customer0.mcOrder.orderCount+" -> 1");
    _root.customer0.mcOrder.orderCount=1;__mdProbeOrderControlled=true;
  }
  if(_root.dosaCount>0 && _root.customer0.mcOrder._visible && _root.mouseState==_root.STATE_BLANK && (probeCase!="cook" || getTimer()-__mdProbePlatedAt>=750)) {
    _root.mcPlate.onRelease();_root.customer0.onRelease();__mdProbeLog("ACTION:source serve,plate="+_root.dosaCount+",served="+_root.customer0.customerDosa);
  }
}
function __mdProbeMatchedAction(action) {
  var before=_root.dosa0._currentframe;
  if(action.name=="place") {_root.mcMavu.onRelease();_root.dosaHolder0.onRelease();}
  else if(action.name=="flip" || action.name=="pickup") _root.dosaHolder0.onRelease();
  else if(action.name=="plate") _root.mcPlate.onRelease();
  else if(action.name=="serve") {_root.mcPlate.onRelease();_root.customer0.onRelease();__mdProbeMatchedServes++;}
  __mdProbeLog("MATCHED_ACTION:"+action.name+",cycle="+action.cycle+",scheduled="+action.at+",actual="+(getTimer()-__mdProbeMatchedStarted)+",beforePose="+before+",afterPose="+_root.dosa0._currentframe+",mouse="+_root.mouseState+",plate="+_root.dosaCount+",served="+_root.customer0.customerDosa);
  var valid=true;
  if(action.name=="place") valid=_root.dosa0._currentframe==1;
  else if(action.name=="flip") valid=_root.dosa0._currentframe==291;
  else if(action.name=="pickup") valid=_root.mouseState==_root.STATE_HOLDINGDOSA;
  else if(action.name=="plate") valid=_root.dosaCount==1;
  else if(action.name=="serve") valid=_root.dosaCount==0 && _root.customer0.customerDosa==1;
  if(!valid) __mdProbeStop("MISMATCH at fixed scheduled action "+action.name+" cycle"+action.cycle);
}
function __mdProbeEnterFrame() {
  __mdProbeFrames++;
  if(probeCase=="matched-day") {
    if(controlledRng!="true") {__mdProbeStop("ERROR:matched-day requires separately controlled RNG derivative");return;}
    if(_root._currentframe==5 && __mdProbeStep==0) {
      var matchedElapsed=getTimer()-__mdProbeMatchedStarted;
      while(__mdProbeMatchedIndex<__mdProbeMatchedActions.length && __mdProbeMatchedActions[__mdProbeMatchedIndex].at<=matchedElapsed && !__mdProbeCompleted) {
        __mdProbeMatchedAction(__mdProbeMatchedActions[__mdProbeMatchedIndex]);__mdProbeMatchedIndex++;
      }
    }
    if(_root._currentframe==6) __mdProbeStop("MISMATCH:game over during fixed successful schedule");
    if(_root._currentframe==7 && __mdProbeEndStarted<0) {
      __mdProbeEndStarted=getTimer();__mdProbeStep=1;
      __mdProbeLog("MATCHED_DAY_RESULT:serves="+__mdProbeMatchedServes+",total="+_root.totalScore+",clock="+_root.clockTime+",actions="+__mdProbeMatchedIndex);
      if(Number(_root.totalScore)!=24 || __mdProbeMatchedServes!=12) __mdProbeStop("MISMATCH:fixed schedule final result");
    }
    if(_root._currentframe==7 && getTimer()-__mdProbeEndStarted>=1000 && !__mdProbeCompleted) {
      _root.btnTomorrow.onRelease();__mdProbeMatchedTomorrowAt=getTimer();__mdProbeStep=2;__mdProbeLog("ACTION:original Tomorrow after matched day; wait for queued frame5 initialization");
    }
    if(__mdProbeStep==2 && getTimer()-__mdProbeMatchedTomorrowAt>=200) {
      if(_root._currentframe==5 && _root.clockTime>=540 && _root.clockTime<=541 && _root.customer0!=undefined) {
        __mdProbeLog("MATCHED_NEXT_DAY_INITIALIZED:day="+_root.currentLevel+",cash="+_root.cashCollected.text+",clock="+_root.clockTime);
        __mdProbeStop(_root.currentLevel==2 && Number(_root.cashCollected.text)==24?"MATCHED_PASS:12serves,cash24,original180second day,Tomorrowday2cash24":"MISMATCH:initialized Tomorrow state");
      } else if(getTimer()-__mdProbeMatchedTomorrowAt>=5000) __mdProbeStop("MISMATCH:Tomorrow initialization timeout");
    }
    return;
  }
  if(probeCase=="tutorial") {
    if(_root._currentframe==4 && __mdProbeStep==0) {
      _root.btnHowToPlay.onRelease();__mdProbeStep=1;
      __mdProbeLog("ACTION:original HowToPlay release; source clock unchanged; tutorial="+_root.mcInstruction._currentframe);
    }
    if(_root._currentframe==4 && __mdProbeStep==1) {
      var tutorialFrame=_root.mcInstruction._currentframe;
      if(tutorialFrame<__mdProbeTutorialPrevious) {__mdProbeTutorialLoops++;__mdProbeLog("TUTORIAL_LOOP:"+__mdProbeTutorialPrevious+"->"+tutorialFrame);}
      if(tutorialFrame<=5 || tutorialFrame>=330 || tutorialFrame%30==0) __mdProbeLog("TUTORIAL_FRAME:"+tutorialFrame+",loops="+__mdProbeTutorialLoops);
      __mdProbeTutorialPrevious=tutorialFrame;
      if(__mdProbeTutorialLoops>=1 && tutorialFrame>=12) {
        _root.mcInstruction.btnSkip.onRelease();__mdProbeStep=2;
        __mdProbeLog("ACTION:original tutorial Skip release;root="+_root._currentframe);
      }
    }
    if(__mdProbeStep==2 && _root._currentframe==5) __mdProbeStop("complete335-frame tutorial loop and original Skip to gameplay observed");
    return;
  }
  if(probeCase=="timing" && __mdProbeFrames<=25) __mdProbeLog("ENTER_FRAME:"+__mdProbeFrames+",root="+_root._currentframe+",template="+_root.mcDosa._currentframe);
  if(__mdProbeGameStarted<0 && _root._currentframe==5 && _root.DosaClick!=undefined) {
    __mdProbeGameStarted=getTimer();__mdProbeLog("GAME_ENTRY:Stop="+typeof(_root.mcDosa.Stop)+",stop="+typeof(_root.mcDosa.stop)+",template="+_root.mcDosa._currentframe);
    clearInterval(_root.interval_CustomerMaker);__mdProbeLog("OVERRIDE:clear source interval_CustomerMaker; game clock unchanged");
    if(probeCase=="template") {_root.cashCollected.text="10";__mdProbeLog("OVERRIDE:cash=10 to observe hidden-template penalty");}
    if(probeCase=="cook" || probeCase=="day-boundary" || probeCase=="day") {__mdProbeCustomer();__mdProbePlace();__mdProbeNextCustomer=20000;}
    if(probeCase=="orphan-removed") {__mdProbeOldCustomer=_root.customer0;__mdProbeOldCustomer.Appear(0);__mdProbeLog("ACTION:first source Appear(table0)");}
    if(probeCase=="patience") {
      _root.mcMavu.onRelease();_root.mouseState=_root.STATE_BLANK;
      _root.customer0.Appear(0);__mdProbeLog("ACTION:source customer0.Appear(table0); template stopped with original bowl release");
    }
  }
  if(__mdProbeGameStarted<0) return;
  var elapsed=getTimer()-__mdProbeGameStarted;
  if(probeCase=="template") {
    if(__mdProbeStep==0 && elapsed>=25000) {
      _root.mcMavu.onRelease();__mdProbeLog("ACTION:post-removal source bowl release,mouse="+_root.mouseState+",template="+_root.mcDosa._currentframe);
      _root.dosaHolder0.onRelease();__mdProbeLog("ACTION:post-removal source slot0 release,mouse="+_root.mouseState+",dosa0="+_root.dosa0._currentframe);
      __mdProbeStep=1;
    }
    if(elapsed>=27000) __mdProbeStop("template observed27seconds including post-removal placement attempt");
  }
  if(probeCase=="timing" && elapsed>=4000) __mdProbeStop("25enterFrame samples and4seconds");
  if(probeCase=="patience" && elapsed>=21000) __mdProbeStop("single source patience interval observed21seconds");
  if(probeCase=="orphan-removed") {
    if(__mdProbeStep==0 && elapsed>=2500) {__mdProbeOldCustomer.Appear(1);__mdProbeStep=1;__mdProbeLog("ACTION:reused source Appear(table1), old patience handle remains");}
    if(__mdProbeStep==1 && elapsed>=5000) {__mdProbeLog("BEFORE_REMOVAL:"+__mdProbeState());_root.StopGame();_root.gotoAndStop(7);__mdProbeStep=2;__mdProbeLog("ACTION:source StopGame then rootframe7; known timers cleared");}
    if(__mdProbeStep==2 && elapsed>=10000) {
      _root.btnTomorrow.onRelease();clearInterval(_root.interval_CustomerMaker);
      _root.mcMavu.onRelease();_root.mouseState=_root.STATE_BLANK;
      __mdProbeStep=3;__mdProbeLog("ACTION:source Tomorrow; new arrivals disabled; original bowl stops new template");
      __mdProbeLog("NEW_DAY_CUSTOMER:patience="+_root.customer0.mcOrder.patienceMeter.patienceMasker._y+",oldName="+__mdProbeOldCustomer._name);
    }
    if(__mdProbeStep==3) {
      var newY=_root.customer0.mcOrder.patienceMeter.patienceMasker._y;
      if(newY!=_root.__mdProbeNewY) {__mdProbeLog("NEW_DAY_CUSTOMER:patience="+newY+",oldName="+__mdProbeOldCustomer._name);_root.__mdProbeNewY=newY;}
      if(elapsed>=15000) __mdProbeStop("removed-customer orphan interval5seconds onresult and5seconds onnextday");
    }
  }
  if(probeCase=="cook" || probeCase=="day-boundary" || probeCase=="day") {
    if(_root._currentframe==5) {
      __mdProbeCook();
      if(probeCase=="cook" && Number(_root.cashCollected.text)>=2 && !_root.customer0._visible) __mdProbeStop("complete source cooking/held/plated/served/eating/exit cycle");
      if(probeCase=="day-boundary" && __mdProbeStep==0 && Number(_root.cashCollected.text)>=2 && !_root.customer0._visible) {_root.clockTime=718;__mdProbeStep=1;__mdProbeLog("OVERRIDE:clockTime=718; actual source TimeStep will finish day");}
      if(probeCase=="day" && __mdProbeStep==0 && elapsed>=__mdProbeNextCustomer && !_root.customer0._visible) {__mdProbeCustomer();__mdProbePlace();__mdProbeNextCustomer+=20000;}
    }
    if(_root._currentframe==7 && __mdProbeEndStarted<0) {__mdProbeEndStarted=getTimer();__mdProbeLog("DAY_RESULT:day="+_root.currentLevel+",total="+_root.totalScore+",clock="+_root.clockTime);}
    if(_root._currentframe==7 && getTimer()-__mdProbeEndStarted>=1000) {_root.btnTomorrow.onRelease();__mdProbeStep=2;__mdProbeLog("ACTION:source Tomorrow release");}
    if(__mdProbeStep==2 && _root._currentframe==5 && _root.currentLevel==2) __mdProbeStop("source day transition and cumulative score observed");
    if(_root._currentframe==6) __mdProbeStop("UNEXPECTED game over in controlled successful scenario");
  }
}
__mdProbeLog("BEGIN:case="+probeCase+",SWF="+_root.$version+",instrumentation=rootframe3append");
var __mdProbePollTimer=setInterval(__mdProbePoll,probeCase=="day" || probeCase=="matched-day"?500:100);
if(probeCase=="matched-day") {
  __mdProbeLog("OVERRIDE:separate derivative bounds ten active ActionRandomNumber operations to1; original CustomerMaker/day intervals unchanged");
  var offsets=[100,6100,9100,10100,16100];var actions=["place","flip","pickup","plate","serve"];
  for(var cycle=0;cycle<12;cycle++) for(var action=0;action<5;action++) __mdProbeMatchedActions.push({at:cycle*14000+offsets[action],name:actions[action],cycle:cycle});
  __mdProbeMatchedActions.sort(function(a,b){return a.at-b.at;});
}
if(probeCase=="timers") {
  var __mdProbeCountZero=0;var __mdProbeCountNegative=0;
  var __mdProbeZero=setInterval(function(){__mdProbeCountZero++;__mdProbeLog("zero,"+__mdProbeCountZero);if(__mdProbeCountZero>=5)clearInterval(__mdProbeZero);},0);
  var __mdProbeNegative=setInterval(function(){__mdProbeCountNegative++;__mdProbeLog("negative,"+__mdProbeCountNegative);if(__mdProbeCountNegative>=5)clearInterval(__mdProbeNegative);},-2000);
}
if(probeCase=="orphan-controls") {
  var __mdProbeVictim=_root.createEmptyMovieClip("__mdProbeVictim",1000001);
  __mdProbeVictim.functionTick=function(){_root.__mdProbeFunctionTicks++;};
  __mdProbeVictim.methodTick=function(){_root.__mdProbeMethodTicks++;};
  var __mdProbeFunctionTimer=setInterval(__mdProbeVictim.functionTick,100);
  var __mdProbeMethodTimer=setInterval(__mdProbeVictim,"methodTick",100);
  var __mdProbeRemoveTimer=setInterval(function(){clearInterval(__mdProbeRemoveTimer);__mdProbeLog("CONTROL_BEFORE_REMOVE:function="+__mdProbeFunctionTicks+",method="+__mdProbeMethodTicks);__mdProbeVictim.removeMovieClip();},550);
  var __mdProbeResultTimer=setInterval(function(){clearInterval(__mdProbeResultTimer);__mdProbeLog("CONTROL_AFTER_REMOVE:function="+__mdProbeFunctionTicks+",method="+__mdProbeMethodTicks);clearInterval(__mdProbeFunctionTimer);clearInterval(__mdProbeMethodTimer);__mdProbeStop("function versus method removed-clip timer control");},1250);
}
if(probeCase!="observe" && probeCase!="timers" && probeCase!="orphan-controls") {
  _root.createEmptyMovieClip("__mdProbeObserver",1000000);_root.__mdProbeObserver.onEnterFrame=__mdProbeEnterFrame;
  var __mdProbeStartTimer=setInterval(function(){clearInterval(__mdProbeStartTimer);if(probeCase=="tutorial"){__mdProbeLog("ACTION:original Start release to instructions");_root.btnStart.onRelease();}else{__mdProbeLog("ACTION:enter source gameplay frame5");if(probeCase=="matched-day")__mdProbeMatchedStarted=getTimer();_root.gotoAndStop(5);}},100);
}
