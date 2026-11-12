class Rijndael
{
   var Nb;
   var Nk;
   var Nr;
   var roundsArray;
   var shiftOffsets;
   var Rcon = [1,2,4,8,16,32,64,128,27,54,108,216,171,77,154,47,94,188,99,198,151,53,106,212,179,125,250,239,197,145];
   var SBox = [99,124,119,123,242,107,111,197,48,1,103,43,254,215,171,118,202,130,201,125,250,89,71,240,173,212,162,175,156,164,114,192,183,253,147,38,54,63,247,204,52,165,229,241,113,216,49,21,4,199,35,195,24,150,5,154,7,18,128,226,235,39,178,117,9,131,44,26,27,110,90,160,82,59,214,179,41,227,47,132,83,209,0,237,32,252,177,91,106,203,190,57,74,76,88,207,208,239,170,251,67,77,51,133,69,249,2,127,80,60,159,168,81,163,64,143,146,157,56,245,188,182,218,33,16,255,243,210,205,12,19,236,95,151,68,23,196,167,126,61,100,93,25,115,96,129,79,220,34,42,144,136,70,238,184,20,222,94,11,219,224,50,58,10,73,6,36,92,194,211,172,98,145,149,228,121,231,200,55,109,141,213,78,169,108,86,244,234,101,122,174,8,186,120,37,46,28,166,180,198,232,221,116,31,75,189,139,138,112,62,181,102,72,3,246,14,97,53,87,185,134,193,29,158,225,248,152,17,105,217,142,148,155,30,135,233,206,85,40,223,140,161,137,13,191,230,66,104,65,153,45,15,176,84,187,22];
   var SBoxInverse = [82,9,106,213,48,54,165,56,191,64,163,158,129,243,215,251,124,227,57,130,155,47,255,135,52,142,67,68,196,222,233,203,84,123,148,50,166,194,35,61,238,76,149,11,66,250,195,78,8,46,161,102,40,217,36,178,118,91,162,73,109,139,209,37,114,248,246,100,134,104,152,22,212,164,92,204,93,101,182,146,108,112,72,80,253,237,185,218,94,21,70,87,167,141,157,132,144,216,171,0,140,188,211,10,247,228,88,5,184,179,69,6,208,44,30,143,202,63,15,2,193,175,189,3,1,19,138,107,58,145,17,65,79,103,220,234,151,242,207,206,240,180,230,115,150,172,116,34,231,173,53,133,226,249,55,232,28,117,223,110,71,241,26,113,29,41,197,137,111,183,98,14,170,24,190,27,252,86,62,75,198,210,121,32,154,219,192,254,120,205,90,244,31,221,168,51,136,7,199,49,177,18,16,89,39,128,236,95,96,81,127,169,25,181,74,13,45,229,122,159,147,201,156,239,160,224,59,77,174,42,245,176,200,235,187,60,131,83,153,97,23,43,4,126,186,119,214,38,225,105,20,99,85,33,12,125];
   var blockSize = 128;
   var keySize = 128;
   function Rijndael(keySize, blockSize)
   {
      if(keySize != null)
      {
         this.keySize = keySize;
      }
      if(blockSize != null)
      {
         this.blockSize = blockSize;
      }
      this.roundsArray = [0,0,0,0,[0,0,0,0,10,0,12,0,14],0,[0,0,0,0,12,0,12,0,14],0,[0,0,0,0,14,0,14,0,14]];
      this.shiftOffsets = [0,0,0,0,[0,1,2,3],0,[0,1,2,3],0,[0,1,3,4]];
      this.Nb = blockSize / 32;
      this.Nk = keySize / 32;
      this.Nr = this.roundsArray[this.Nk][this.Nb];
   }
   function encrypt(src, key, mode)
   {
      var _loc5_ = new Array();
      var _loc6_ = new Array();
      var _loc4_ = this.blockSize / 8;
      if(mode == "CBC")
      {
         _loc5_ = this.getRandomBytes(_loc4_);
      }
      var _loc7_ = this.formatPlaintext(this.strToChars(src));
      var _loc8_ = this.keyExpansion(this.strToChars(key));
      var _loc3_ = 0;
      var _loc2_;
      while(_loc3_ < _loc7_.length / _loc4_)
      {
         _loc6_ = _loc7_.slice(_loc3_ * _loc4_,(_loc3_ + 1) * _loc4_);
         if(mode == "CBC")
         {
            _loc2_ = 0;
            while(_loc2_ < _loc4_)
            {
               _loc6_[_loc2_] ^= _loc5_[_loc3_ * _loc4_ + _loc2_];
               _loc2_ = _loc2_ + 1;
            }
         }
         _loc5_ = _loc5_.concat(this.encryption(_loc6_,_loc8_));
         _loc3_ = _loc3_ + 1;
      }
      return this.charsToHex(_loc5_);
   }
   function decrypt(src, key, mode)
   {
      var _loc5_ = new Array();
      var _loc7_ = new Array();
      var _loc6_ = this.hexToChars(src);
      var _loc4_ = this.blockSize / 8;
      var _loc8_ = this.keyExpansion(this.strToChars(key));
      var _loc3_ = _loc6_.length / _loc4_ - 1;
      var _loc2_;
      while(_loc3_ > 0)
      {
         _loc7_ = this.decryption(_loc6_.slice(_loc3_ * _loc4_,(_loc3_ + 1) * _loc4_),_loc8_);
         if(mode == "CBC")
         {
            _loc2_ = 0;
            while(_loc2_ < _loc4_)
            {
               _loc5_[(_loc3_ - 1) * _loc4_ + _loc2_] = _loc7_[_loc2_] ^ _loc6_[(_loc3_ - 1) * _loc4_ + _loc2_];
               _loc2_ = _loc2_ + 1;
            }
         }
         else
         {
            _loc5_ = _loc7_.concat(_loc5_);
         }
         _loc3_ = _loc3_ - 1;
      }
      if(mode == "ECB")
      {
         _loc5_ = this.decryption(_loc6_.slice(0,_loc4_),_loc8_).concat(_loc5_);
      }
      return this.charsToStr(_loc5_);
   }
   function cyclicShiftLeft(src, pos)
   {
      var _loc2_ = src.slice(0,pos);
      src = src.slice(pos).concat(_loc2_);
      return src;
   }
   function xtime(poly)
   {
      poly <<= 1;
      return !(poly & 0x0100) ? poly : poly ^ 0x011B;
   }
   function mult_GF256(x, y)
   {
      var _loc4_ = 0;
      var _loc2_ = 1;
      while(_loc2_ < 256)
      {
         if(x & _loc2_)
         {
            _loc4_ ^= y;
         }
         _loc2_ *= 2;
         y = this.xtime(y);
      }
      return _loc4_;
   }
   function byteSub(state, dir)
   {
      var _loc5_;
      if(dir == "encrypt")
      {
         _loc5_ = this.SBox;
      }
      else
      {
         _loc5_ = this.SBoxInverse;
      }
      var _loc3_ = 0;
      var _loc2_;
      while(_loc3_ < 4)
      {
         _loc2_ = 0;
         while(_loc2_ < this.Nb)
         {
            state[_loc3_][_loc2_] = _loc5_[state[_loc3_][_loc2_]];
            _loc2_ = _loc2_ + 1;
         }
         _loc3_ = _loc3_ + 1;
      }
   }
   function shiftRow(state, dir)
   {
      var _loc2_ = 1;
      while(_loc2_ < 4)
      {
         if(dir == "encrypt")
         {
            state[_loc2_] = this.cyclicShiftLeft(state[_loc2_],this.shiftOffsets[this.Nb][_loc2_]);
         }
         else
         {
            state[_loc2_] = this.cyclicShiftLeft(state[_loc2_],this.Nb - this.shiftOffsets[this.Nb][_loc2_]);
         }
         _loc2_ = _loc2_ + 1;
      }
   }
   function mixColumn(state, dir)
   {
      var _loc5_ = new Array();
      var _loc2_ = 0;
      var _loc4_;
      while(_loc2_ < this.Nb)
      {
         _loc4_ = 0;
         while(_loc4_ < 4)
         {
            if(dir == "encrypt")
            {
               _loc5_[_loc4_] = this.mult_GF256(state[_loc4_][_loc2_],2) ^ this.mult_GF256(state[(_loc4_ + 1) % 4][_loc2_],3) ^ state[(_loc4_ + 2) % 4][_loc2_] ^ state[(_loc4_ + 3) % 4][_loc2_];
            }
            else
            {
               _loc5_[_loc4_] = this.mult_GF256(state[_loc4_][_loc2_],14) ^ this.mult_GF256(state[(_loc4_ + 1) % 4][_loc2_],11) ^ this.mult_GF256(state[(_loc4_ + 2) % 4][_loc2_],13) ^ this.mult_GF256(state[(_loc4_ + 3) % 4][_loc2_],9);
            }
            _loc4_ = _loc4_ + 1;
         }
         _loc4_ = 0;
         while(_loc4_ < 4)
         {
            state[_loc4_][_loc2_] = _loc5_[_loc4_];
            _loc4_ = _loc4_ + 1;
         }
         _loc2_ = _loc2_ + 1;
      }
   }
   function addRoundKey(state, roundKey)
   {
      var _loc2_ = 0;
      while(_loc2_ < this.Nb)
      {
         state[0][_loc2_] ^= roundKey[_loc2_] & 0xFF;
         state[1][_loc2_] ^= roundKey[_loc2_] >> 8 & 0xFF;
         state[2][_loc2_] ^= roundKey[_loc2_] >> 16 & 0xFF;
         state[3][_loc2_] ^= roundKey[_loc2_] >> 24 & 0xFF;
         _loc2_ = _loc2_ + 1;
      }
   }
   function keyExpansion(key)
   {
      var _loc2_ = 0;
      this.Nk = this.keySize / 32;
      this.Nb = this.blockSize / 32;
      var _loc4_ = new Array();
      this.Nr = this.roundsArray[this.Nk][this.Nb];
      var _loc3_ = 0;
      while(_loc3_ < this.Nk)
      {
         _loc4_[_loc3_] = key[4 * _loc3_] | key[4 * _loc3_ + 1] << 8 | key[4 * _loc3_ + 2] << 16 | key[4 * _loc3_ + 3] << 24;
         _loc3_ = _loc3_ + 1;
      }
      _loc3_ = this.Nk;
      while(_loc3_ < this.Nb * (this.Nr + 1))
      {
         _loc2_ = _loc4_[_loc3_ - 1];
         if(_loc3_ % this.Nk == 0)
         {
            _loc2_ = (this.SBox[_loc2_ >> 8 & 0xFF] | this.SBox[_loc2_ >> 16 & 0xFF] << 8 | this.SBox[_loc2_ >> 24 & 0xFF] << 16 | this.SBox[_loc2_ & 0xFF] << 24) ^ this.Rcon[Math.floor(_loc3_ / this.Nk) - 1];
         }
         else if(this.Nk > 6 && _loc3_ % this.Nk == 4)
         {
            _loc2_ = this.SBox[_loc2_ >> 24 & 0xFF] << 24 | this.SBox[_loc2_ >> 16 & 0xFF] << 16 | this.SBox[_loc2_ >> 8 & 0xFF] << 8 | this.SBox[_loc2_ & 0xFF];
         }
         _loc4_[_loc3_] = _loc4_[_loc3_ - this.Nk] ^ _loc2_;
         _loc3_ = _loc3_ + 1;
      }
      return _loc4_;
   }
   function Round(state, roundKey)
   {
      this.byteSub(state,"encrypt");
      this.shiftRow(state,"encrypt");
      this.mixColumn(state,"encrypt");
      this.addRoundKey(state,roundKey);
   }
   function InverseRound(state, roundKey)
   {
      this.addRoundKey(state,roundKey);
      this.mixColumn(state,"decrypt");
      this.shiftRow(state,"decrypt");
      this.byteSub(state,"decrypt");
   }
   function FinalRound(state, roundKey)
   {
      this.byteSub(state,"encrypt");
      this.shiftRow(state,"encrypt");
      this.addRoundKey(state,roundKey);
   }
   function InverseFinalRound(state, roundKey)
   {
      this.addRoundKey(state,roundKey);
      this.shiftRow(state,"decrypt");
      this.byteSub(state,"decrypt");
   }
   function encryption(block, expandedKey)
   {
      block = this.packBytes(block);
      this.addRoundKey(block,expandedKey);
      var _loc2_ = 1;
      while(_loc2_ < this.Nr)
      {
         this.Round(block,expandedKey.slice(this.Nb * _loc2_,this.Nb * (_loc2_ + 1)));
         _loc2_ = _loc2_ + 1;
      }
      this.FinalRound(block,expandedKey.slice(this.Nb * this.Nr));
      return this.unpackBytes(block);
   }
   function decryption(block, expandedKey)
   {
      block = this.packBytes(block);
      this.InverseFinalRound(block,expandedKey.slice(this.Nb * this.Nr));
      var _loc2_ = this.Nr - 1;
      while(_loc2_ > 0)
      {
         this.InverseRound(block,expandedKey.slice(this.Nb * _loc2_,this.Nb * (_loc2_ + 1)));
         _loc2_ = _loc2_ - 1;
      }
      this.addRoundKey(block,expandedKey);
      return this.unpackBytes(block);
   }
   function packBytes(octets)
   {
      var _loc2_ = new Array();
      _loc2_[0] = new Array();
      _loc2_[1] = new Array();
      _loc2_[2] = new Array();
      _loc2_[3] = new Array();
      var _loc1_ = 0;
      while(_loc1_ < octets.length)
      {
         _loc2_[0][_loc1_ / 4] = octets[_loc1_];
         _loc2_[1][_loc1_ / 4] = octets[_loc1_ + 1];
         _loc2_[2][_loc1_ / 4] = octets[_loc1_ + 2];
         _loc2_[3][_loc1_ / 4] = octets[_loc1_ + 3];
         _loc1_ += 4;
      }
      return _loc2_;
   }
   function unpackBytes(packed)
   {
      var _loc1_ = new Array();
      var _loc2_ = 0;
      while(_loc2_ < packed[0].length)
      {
         _loc1_[_loc1_.length] = packed[0][_loc2_];
         _loc1_[_loc1_.length] = packed[1][_loc2_];
         _loc1_[_loc1_.length] = packed[2][_loc2_];
         _loc1_[_loc1_.length] = packed[3][_loc2_];
         _loc2_ = _loc2_ + 1;
      }
      return _loc1_;
   }
   function formatPlaintext(plaintext)
   {
      var _loc3_ = this.blockSize / 8;
      var _loc2_ = _loc3_ - plaintext.length % _loc3_;
      while(_loc2_ > 0 && _loc2_ < _loc3_)
      {
         plaintext[plaintext.length] = 0;
         _loc2_ = _loc2_ - 1;
      }
      return plaintext;
   }
   function getRandomBytes(howMany)
   {
      var _loc2_ = new Array();
      var _loc1_ = 0;
      while(_loc1_ < howMany)
      {
         _loc2_[_loc1_] = Math.round(Math.random() * 255);
         _loc1_ = _loc1_ + 1;
      }
      return _loc2_;
   }
   function hexToChars(hex)
   {
      var _loc3_ = new Array();
      var _loc1_ = hex.substr(0,2) != "0x" ? 0 : 2;
      while(_loc1_ < hex.length)
      {
         _loc3_.push(parseInt(hex.substr(_loc1_,2),16));
         _loc1_ += 2;
      }
      return _loc3_;
   }
   function charsToHex(chars)
   {
      var _loc4_ = new String("");
      var _loc3_ = new Array("0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f");
      var _loc1_ = 0;
      while(_loc1_ < chars.length)
      {
         _loc4_ += _loc3_[chars[_loc1_] >> 4] + _loc3_[chars[_loc1_] & 0x0F];
         _loc1_ = _loc1_ + 1;
      }
      return _loc4_;
   }
   function charsToStr(chars)
   {
      var _loc3_ = new String("");
      var _loc1_ = 0;
      while(_loc1_ < chars.length)
      {
         _loc3_ += String.fromCharCode(chars[_loc1_]);
         _loc1_ = _loc1_ + 1;
      }
      return _loc3_;
   }
   function strToChars(str)
   {
      var _loc3_ = new Array();
      var _loc1_ = 0;
      while(_loc1_ < str.length)
      {
         _loc3_.push(str.charCodeAt(_loc1_));
         _loc1_ = _loc1_ + 1;
      }
      return _loc3_;
   }
}
