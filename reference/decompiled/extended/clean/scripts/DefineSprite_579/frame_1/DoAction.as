txtExternalScore.text = _root.totalScore;
btnSubmit_External.onRelease = function()
{
   _parent.SubmitScore_External(txtExternalScore.text,inpPlayerName.text);
};
