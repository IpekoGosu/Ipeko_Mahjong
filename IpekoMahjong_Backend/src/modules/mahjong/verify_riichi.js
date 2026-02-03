// Riichi Library test file
const Riichi = require('riichi');

try {
  console.log('Debugging Riichi Properties...');

  const handStr = '123m456p789s11z222z'; 

  // Test 1: Setting Properties Manually
  const r = new Riichi(handStr);
  
  // Set Options
  r.bakaze = 0; // East? No, comment said 1=East. Let's try 0 and 1.
  r.jikaze = 2; // South
  r.dora = ['1m']; // Actual tiles
  r.isTsumo = true;
  r.extra = 'riichi'; // Guessing string format for Yaku flags
  // If extra supports multiple, maybe comma separated? 'riichi,ippatsu'?
  
  // Note: The constructor parsing logic said: 
  // if (!v.includes(m/p/s/z)) this.extra = v
  // So maybe passing "+riichi+ippatsu" works? 
  // But constructor overwrites extra: this.extra = v. So last one wins?
  
  const result = r.calc();
  console.log('Manual Prop Set Result:', 
    'Han:', result.han, 
    'Yaku:', Object.keys(result.yaku)
  );

  // Test 2: passing extra via string
  const strWithExtra = '123m456p789s11z222z+riichi+ippatsu';
  const r2 = new Riichi(strWithExtra);
  // Constructor logic: this.extra = v.
  // loop 1: extra = 'riichi'
  // loop 2: extra = 'ippatsu'
  // So 'riichi' is lost?
  console.log('String Extra Test (Result):', Object.keys(r2.calc().yaku));
  console.log('String Extra Test (Property):', r2.extra);

} catch (e) {
  console.error('Error:', e);
}
