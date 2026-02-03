// Riichi Library test file
const Riichi = require('riichi');

try {
  console.log('Testing Riichi library...');

  // Test 1: Standard format
  const hand1 = new Riichi('123m456p789s1122z');
  const result1 = hand1.calc();
  console.log('Hand 1 (Standard):', 'Shanten:', result1.hairi?.now);

  // Test 2: Verbose format (1m2m3m...)
  const hand2 = new Riichi('1m2m3m4p5p6p7s8s9s1z1z2z2z');
  const result2 = hand2.calc();
  console.log('Hand 2 (Verbose):', 'Shanten:', result2.hairi?.now);

  // Test Win check
  // Assuming a tenpai hand: 123m 456p 789s 11z 22z (waiting for 2z)
  const tenpaiHand = new Riichi('123m456p789s1z1z2z2z');
  const tenpaiResult = tenpaiHand.calc();
  console.log('Tenpai Hand Shanten:', tenpaiResult.hairi?.now); // Should be 0
  // If we add the winning tile to the hand string, shanten should be -1.
  const winningHandStr = '123m456p789s11z222z';
  const winningHand = new Riichi(winningHandStr);
  const winningResult = winningHand.calc();
  console.log('Winning Hand isAgari:', winningResult.isAgari); // Should be true
} catch (e) {
  console.error('Error:', e);
}
